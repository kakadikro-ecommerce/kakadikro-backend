import Order from "./order.model.js";
import User from "../user/user.model.js";
import Product from "../product/product.model.js";
import Cart from "../cart/cart.model.js";
import Payment from "../payment/payment.model.js";
import puppeteer from "puppeteer";
import { buildOrderLabelHtml } from "./order-label.template.js";
import {
  ensureFound,
  ensureValidObjectId,
  badRequest,
  forbidden,
} from "../../shared/errors/http-error.js";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../shared/utils/pagination.js";
import {
  attachOrderRelations,
  buildOrderItem,
  calculateTotals,
  ensureOrderAccess,
  findVariantByWeight,
  normalizeOrderImages,
  rethrowOrderServiceError,
  rollbackInventory,
} from "./order.helpers.js";
import {
  getRazorpayInstance,
  isOnlineOrderPayment,
  rethrowPaymentServiceError,
} from "../payment/payment.helpers.js";

const STATUS_FLOW = {
  pending: ["confirmed"],
  confirmed: ["dispatched"],
  dispatched: ["delivered"],
  delivered: [],
};

export const createOrder = async (userId, payload) => {
  try {
    ensureValidObjectId(userId, "user");

    const user = await User.findById(userId).select("name email");

    const cart = ensureFound(
      await Cart.findOne({ user: userId }).populate(
        "items.product",
        "name slug images variants isActive"
      ),
      "Cart not found"
    );

    if (!Array.isArray(cart.items) || cart.items.length === 0) {
      throw badRequest("Cart is empty");
    }

    const productIds = cart.items.map((item) => {
      const productId = item.product?._id || item.product;
      ensureValidObjectId(productId, "product");
      return productId;
    });

    const products = await Product.find({
      _id: { $in: productIds },
      isActive: true,
    });

    const productMap = new Map(products.map((product) => [product.id, product]));

    const orderItems = cart.items.map((item) => {
      const productId = item.product?._id
        ? item.product._id.toString()
        : item.product.toString();
      const product = ensureFound(
        productMap.get(productId),
        `Product not found for id ${productId}`
      );
      const variant = findVariantByWeight(product, item.weight);

      if (!variant) {
        throw badRequest(
          `Variant '${item.weight}' is not available for product '${product.name}'`
        );
      }

      return buildOrderItem(product, variant, item.quantity);
    });

    const totals = calculateTotals(orderItems, payload);

    const shippingAddress = {
      ...payload.shippingAddress,
      fullName: user?.name || payload.shippingAddress.fullName,
    };

    const createdOrder = await Order.create({
      user: userId,
      items: orderItems,
      shippingAddress,
      paymentMethod: payload.paymentMethod || "cod",
      ...totals,
    });

    cart.items = [];
    await cart.save();

    return normalizeOrderImages(
      await attachOrderRelations(Order.findById(createdOrder._id))
    );
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to create order");
  }
};

export const getMyOrders = async (userId, query = {}) => {
  try {
    ensureValidObjectId(userId, "user");

    const { page, limit, skip } = normalizePagination(query);
    const filter = { user: userId, isActive: true };

    const [orders, total] = await Promise.all([
      attachOrderRelations(
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      ),
      Order.countDocuments(filter),
    ]);

    return {
      pagination: buildPaginationMeta({ total, page, limit }),
      orders: orders.map((order) =>
        normalizeOrderImages(order.toObject ? order.toObject() : order)
      ),
    };
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to fetch user orders");
  }
};

export const getAllOrders = async (query = {}) => {
  try {
    const { page, limit, skip } = normalizePagination(query);

    const filter = {};

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive === "true";
    } else {
      filter.isActive = true;
    }

    if (query.orderStatus) {
      filter.orderStatus = query.orderStatus;
    }

    if (query.paymentStatus) {
      filter.paymentStatus = query.paymentStatus;
    }

    if (query.userId) {
      ensureValidObjectId(query.userId, "user");
      filter.user = query.userId;
    }

    const [orders, total] = await Promise.all([
      attachOrderRelations(
        Order.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
      ),
      Order.countDocuments(filter),
    ]);

    return {
      pagination: buildPaginationMeta({ total, page, limit }),
      orders: orders.map((order) =>
        normalizeOrderImages(order.toObject ? order.toObject() : order)
      ),
    };
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to fetch orders");
  }
};

export const getOrderById = async (orderId) => {
  try {
    ensureValidObjectId(orderId, "order");

    const order = ensureFound(
      await attachOrderRelations(Order.findOne({ _id: orderId, isActive: true })),
      "Order not found"
    );

    return normalizeOrderImages(
      order.toObject ? order.toObject() : order
    );
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to fetch order");
  }
};

export const trackOrder = async (orderId, requester) => {
  try {
    ensureValidObjectId(orderId, "order");

    const order = ensureFound(
      await attachOrderRelations(
        Order.findOne({ _id: orderId, isActive: true })
      ),
      "Order not found"
    );

    ensureOrderAccess(order, requester);

    const orderData = order.toObject ? order.toObject() : order;

    if (orderData.shipment?.trackingId) {
      orderData.tracking = {
        trackingId: orderData.shipment.trackingId,
        courierName: orderData.shipment.courierName,
      };
    }

    return normalizeOrderImages(orderData);
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to fetch order");
  }
};

export const updateMyOrder = async (orderId, userId, payload) => {
  try {
    ensureValidObjectId(orderId, "order");
    ensureValidObjectId(userId, "user");

    const order = ensureFound(
      await Order.findOne({ _id: orderId, isActive: true }),
      "Order not found"
    );

    if (order.user.toString() !== userId) {
      throw forbidden("You are not allowed to update this order");
    }

    if (!["pending"].includes(order.orderStatus)) {
      throw badRequest("Order cannot be updated after confirmation");
    }

    if (payload.shippingAddress) {
      order.shippingAddress = {
        ...(order.shippingAddress?.toObject?.() || order.shippingAddress),
        ...payload.shippingAddress,
      };

      order.markModified("shippingAddress");
    }

    await order.save();

    return normalizeOrderImages(
      await attachOrderRelations(Order.findById(order._id))
    );
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to update order");
  }
};

export const updateOrderStatus = async (orderId, payload) => {
  try {
    ensureValidObjectId(orderId, "order");

    const order = ensureFound(
      await Order.findOne({ _id: orderId, isActive: true }),
      "Order not found"
    );

    const inventoryAdjustments = [];

    const rawTrackingId =
      payload.trackingId ??
      payload.shipment?.trackingId ??
      payload.trackingNumber ??
      "";

    const rawCourierName =
      payload.courierName ??
      payload.shipment?.courierName ??
      payload.courier ??
      "";

    if (!order.shipment) {
      order.shipment = {};
    }

    const hasTrackingId =
      typeof rawTrackingId === "string" && rawTrackingId.trim().length > 0;

    const hasCourierName =
      typeof rawCourierName === "string" && rawCourierName.trim().length > 0;

    const requestedStatus = payload.orderStatus;

    const trackingId = hasTrackingId
      ? rawTrackingId.trim()
      : order.shipment?.trackingId || "";

    const courierName = hasCourierName
      ? rawCourierName.trim()
      : order.shipment?.courierName || "";

    if (hasTrackingId) {
      order.shipment.trackingId = trackingId;
    }

    if (hasCourierName) {
      order.shipment.courierName = courierName;
    }

    if (requestedStatus) {
      const currentStatus = order.orderStatus;

      if (currentStatus === requestedStatus) {
        throw badRequest(`Order is already in '${currentStatus}' status`);
      }

      const allowedNextStatuses = STATUS_FLOW[currentStatus] || [];

      if (!allowedNextStatuses.includes(requestedStatus)) {
        throw badRequest(
          `Cannot change order status from '${currentStatus}' to '${requestedStatus}'`
        );
      }


      if (requestedStatus === "confirmed") {
        if (currentStatus !== "pending") {
          throw badRequest("Only pending orders can be confirmed");
        }

        const productIds = order.items.map((item) => {
          ensureValidObjectId(item.product, "product");
          return item.product.toString();
        });

        const products = await Product.find({
          _id: { $in: productIds },
          isActive: true,
        });

        const productMap = new Map(
          products.map((product) => [product.id, product])
        );

        const touchedProducts = new Set();

        for (const item of order.items) {
          const productId = item.product.toString();

          const product = ensureFound(
            productMap.get(productId),
            `Product not found for id ${productId}`
          );

          const variant = findVariantByWeight(product, item.weight);

          if (!variant) {
            throw badRequest(
              `Variant '${item.weight}' is not available for product '${product.name}'`
            );
          }

          if (variant.stock < item.quantity) {
            throw badRequest(
              `Insufficient stock for '${product.name}' (${variant.weight}). Available stock is ${variant.stock}.`
            );
          }

          inventoryAdjustments.push({
            product,
            variant,
            originalStock: variant.stock,
            quantity: item.quantity,
          });
        }

        try {
          for (const adjustment of inventoryAdjustments) {
            adjustment.variant.stock -= adjustment.quantity;
            touchedProducts.add(adjustment.product);
          }

          await Promise.all(
            Array.from(touchedProducts, (product) => product.save())
          );
        } catch (error) {
          if (inventoryAdjustments.length > 0) {
            await rollbackInventory(inventoryAdjustments);
          }
          throw error;
        }
      }

      if (requestedStatus === "dispatched") {
        if (currentStatus !== "confirmed") {
          throw badRequest("Only confirmed orders can be dispatched");
        }

        if (!trackingId) {
          throw badRequest("Tracking id is required before dispatching an order");
        }

        if (!courierName) {
          throw badRequest("Courier name is required before dispatching an order");
        }

        order.shipment.trackingId = trackingId;
        order.shipment.courierName = courierName;

        if (!order.shipment.dispatchedAt) {
          order.shipment.dispatchedAt = new Date();
        }
      }

      if (requestedStatus === "delivered") {
        if (currentStatus !== "dispatched") {
          throw badRequest("Only dispatched orders can be delivered");
        }

        if (!order.shipment?.trackingId || !order.shipment?.courierName) {
          throw badRequest("Order must be dispatched before delivery");
        }
      }

      if (requestedStatus === "cancelled") {
        throw badRequest("Order cancellation is only allowed by the user");
      }

      order.orderStatus = requestedStatus;

      if (requestedStatus === "delivered" && !order.shipment.deliveredAt) {
        order.shipment.deliveredAt = new Date();
      }
    }

    if (payload.paymentStatus) {
      order.paymentStatus = payload.paymentStatus;

      if (payload.paymentStatus === "paid" && !order.paidAt) {
        order.paidAt = new Date();
      }
    }

    try {
      await order.save();
    } catch (error) {
      if (inventoryAdjustments.length > 0) {
        await rollbackInventory(inventoryAdjustments);
      }
      throw error;
    }

    return normalizeOrderImages(
      await attachOrderRelations(Order.findById(order._id))
    );
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to update order");
  }
};

export const cancelOrder = async (orderId, userId) => {
  try {
    ensureValidObjectId(orderId, "order");
    ensureValidObjectId(userId, "user");

    const order = ensureFound(
      await Order.findOne({ _id: orderId, isActive: true }),
      "Order not found"
    );
    const inventoryAdjustments = [];

    if (order.user.toString() !== userId) {
      throw forbidden("You are not allowed to cancel this order");
    }

    if (!["pending", "confirmed"].includes(order.orderStatus)) {
      throw badRequest("Only pending or confirmed orders can be cancelled");
    }

    const previousStatus = order.orderStatus;
    order.orderStatus = "cancelled";

    if (previousStatus === "confirmed") {
      const productIds = order.items.map((item) => {
        ensureValidObjectId(item.product, "product");
        return item.product.toString();
      });

      const products = await Product.find({
        _id: { $in: productIds },
      });
      const productMap = new Map(products.map((product) => [product.id, product]));
      const touchedProducts = new Set();

      for (const item of order.items) {
        const productId = item.product.toString();
        const product = ensureFound(
          productMap.get(productId),
          `Product not found for id ${productId}`
        );
        const variant = findVariantByWeight(product, item.weight);

        if (!variant) {
          throw badRequest(
            `Variant '${item.weight}' is not available for product '${product.name}'`
          );
        }

        inventoryAdjustments.push({
          product,
          variant,
          originalStock: variant.stock,
          quantity: -item.quantity,
        });
      }

      for (const adjustment of inventoryAdjustments) {
        adjustment.variant.stock -= adjustment.quantity;
        touchedProducts.add(adjustment.product);
      }

      await Promise.all(Array.from(touchedProducts, (product) => product.save()));
    }

    if (
      isOnlineOrderPayment(order.paymentMethod) &&
      order.paymentStatus === "paid"
    ) {
      const payment = ensureFound(
        await Payment.findOne({ orderId: order._id, userId }),
        "Payment record not found for this order"
      );

      try {
        const razorpay = getRazorpayInstance();
        const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
          amount: Math.round(order.totalAmount * 100),
        });

        payment.status = "refunded";
        payment.refund = {
          razorpayRefundId: refund.id || "",
          amount: Number(refund.amount || 0) / 100,
          status: refund.status || "processed",
          refundedAt: new Date(),
        };
        await payment.save();

        order.paymentStatus = "refunded";
      } catch (error) {
        payment.refund = {
          razorpayRefundId: "",
          amount: order.totalAmount,
          status: "failed",
          refundedAt: null,
        };
        await payment.save();
        order.paymentStatus = "failed";
        await order.save();
        rethrowPaymentServiceError(error, "Failed to refund cancelled order");
      }
    }

    try {
      await order.save();
    } catch (error) {
      if (inventoryAdjustments.length > 0) {
        await rollbackInventory(inventoryAdjustments);
      }

      throw error;
    }

    return normalizeOrderImages(
      await attachOrderRelations(Order.findById(order._id))
    );
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to cancel order");
  }
};

export const updateOrderActiveStatus = async (orderId, payload) => {
  try {
    ensureValidObjectId(orderId, "order");

    if (typeof payload?.isActive !== "boolean") {
      throw badRequest("isActive must be a boolean value");
    }

    const order = ensureFound(await Order.findById(orderId), "Order not found");

    order.isActive = payload.isActive;
    await order.save();

    return normalizeOrderImages(
      await attachOrderRelations(Order.findById(order._id))
    );
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to update order active status");
  }
}; 

export const generateOrderLabel = async (orderId) => {
  try {
    ensureValidObjectId(orderId, "order");

    const order = ensureFound(
      await attachOrderRelations(
        Order.findById(orderId)
      ),
      "Order not found"
    );

    const data = order.toObject ? order.toObject() : order;

    const html = buildOrderLabelHtml(data);

    const browser = await puppeteer.launch({
      headless: "new",
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      return await page.pdf({
        width: "6in",
        height: "4in",
        margin: {
          top: "0",
          right: "0",
          bottom: "0",
          left: "0",
        },
        preferCSSPageSize: true,
        printBackground: true,
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to generate label");
  }
};
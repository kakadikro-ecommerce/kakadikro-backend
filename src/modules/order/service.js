import Order from "./model.js";
import Product from "../product/model.js";
import Cart from "../cart/model.js";
import {
  ensureFound,
  ensureValidObjectId,
  badRequest,
} from "../../shared/errors/http-error.js";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../shared/utils/pagination.js";
import {
  attachOrderRelations,
  buildOrderItem,
  buildOrderNumber,
  calculateTotals,
  ensureOrderAccess,
  findVariantByWeight,
  rethrowOrderServiceError,
  rollbackInventory,
} from "./helpers.js";



export const createOrder = async (userId, payload) => {
  try {
    ensureValidObjectId(userId, "user");
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

    const inventoryAdjustments = [];
    let createdOrder = null;

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

      if (variant.stock < item.quantity) {
        throw badRequest(
          `Only ${variant.stock} item(s) left for '${product.name}' (${variant.weight})`
        );
      }

      inventoryAdjustments.push({
        product,
        variant,
        originalStock: variant.stock,
        quantity: item.quantity,
      });

      return buildOrderItem(product, variant, item.quantity);
    });

    const totals = calculateTotals(orderItems, payload);
    const touchedProducts = new Set();

    try {
      for (const adjustment of inventoryAdjustments) {
        adjustment.variant.stock -= adjustment.quantity;
        touchedProducts.add(adjustment.product);
      }

      await Promise.all(Array.from(touchedProducts, (product) => product.save()));

      createdOrder = await Order.create({
        orderNumber: buildOrderNumber(),
        user: userId,
        items: orderItems,
        shippingAddress: payload.shippingAddress,
        paymentMethod: payload.paymentMethod || "cod",
        notes: payload.notes || "",
        ...totals,
      });

      cart.items = [];
      await cart.save();

      return attachOrderRelations(Order.findById(createdOrder._id));
    } catch (error) {
      if (createdOrder) {
        await Order.findByIdAndDelete(createdOrder._id);
      }

      if (inventoryAdjustments.length > 0) {
        await rollbackInventory(inventoryAdjustments);
      }

      throw error;
    }
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to create order");
  }
};

export const getMyOrders = async (userId, query = {}) => {
  try {
    ensureValidObjectId(userId, "user");

    const { page, limit, skip } = normalizePagination(query);
    const filter = { user: userId };

    const [orders, total] = await Promise.all([
      attachOrderRelations(
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      ),
      Order.countDocuments(filter),
    ]);

    return {
      pagination: buildPaginationMeta({ total, page, limit }),
      orders,
    };
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to fetch user orders");
  }
};

export const getAllOrders = async (query = {}) => {
  try {
    const { page, limit, skip } = normalizePagination(query);
    const filter = {};

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
        Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      ),
      Order.countDocuments(filter),
    ]);

    return {
      pagination: buildPaginationMeta({ total, page, limit }),
      orders,
    };
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to fetch orders");
  }
};

export const getOrderById = async (orderId, requester) => {
  try {
    ensureValidObjectId(orderId, "order");

    const order = ensureFound(
      await attachOrderRelations(Order.findById(orderId)),
      "Order not found"
    );

    ensureOrderAccess(order, requester);

    return order;
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to fetch order");
  }
};

export const updateOrderStatus = async (orderId, payload) => {
  try {
    ensureValidObjectId(orderId, "order");

    const order = ensureFound(await Order.findById(orderId), "Order not found");

    if (payload.orderStatus) {
      order.orderStatus = payload.orderStatus;
      if (payload.orderStatus === "delivered" && !order.deliveredAt) {
        order.deliveredAt = new Date();
      }
    }

    if (payload.paymentStatus) {
      order.paymentStatus = payload.paymentStatus;
      if (payload.paymentStatus === "paid" && !order.paidAt) {
        order.paidAt = new Date();
      }
    }

    if (payload.adminNote !== undefined) {
      order.adminNote = payload.adminNote;
    }

    await order.save();

    return attachOrderRelations(Order.findById(order._id));
  } catch (error) {
    rethrowOrderServiceError(error, "Failed to update order");
  }
};

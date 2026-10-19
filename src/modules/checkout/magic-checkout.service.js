import Cart from "../cart/cart.model.js";
import Order from "../order/order.model.js";
import Product from "../product/product.model.js";
import Payment from "../payment/payment.model.js";
import {
  badRequest,
  ensureFound,
  ensureValidObjectId,
  forbidden,
} from "../../shared/errors/http-error.js";
import { getPublicMediaUrl } from "../../shared/utils/image.js";
import {
  buildOrderItem,
  calculateTotals,
  findVariantByWeight,
  normalizeOrderImages,
  rethrowOrderServiceError,
} from "../order/order.helpers.js";
import { getRazorpayInstance } from "../payment/payment.helpers.js";
import { generateGuestToken, hashGuestToken, isGuestToken } from "./guest-token.js";

const CLIENT_PRICE_FIELDS = [
  "unitPrice",
  "totalAmount",
  "shippingAmount",
  "taxAmount",
  "discountAmount",
  "amount",
  "items",
  "lineItems",
];

export const rejectClientPricing = (payload = {}) => {
  const present = CLIENT_PRICE_FIELDS.filter((field) => payload[field] !== undefined);
  if (present.length > 0) {
    throw badRequest("Checkout prices and items must be calculated by the server");
  }
};

const buildLineItems = (orderItems, productsById) =>
  orderItems.map((item) => {
    const product = productsById.get(String(item.product));
    const pricePaise = Math.round(Number(item.unitPrice) * 100);
    const imageUrl = getPublicMediaUrl(item.productImage || product?.images?.[0]?.url || "") || "";

    return {
      sku: String(item.product),
      variant_id: String(item.weight || item.product),
      price: pricePaise,
      offer_price: pricePaise,
      quantity: item.quantity,
      name: item.name,
      description: String(product?.shortDescription || product?.description || item.name).slice(0, 255),
      ...(imageUrl ? { image_url: imageUrl } : {}),
    };
  });

const loadCart = async (actor) => {
  const filter = actor.userId
    ? { user: actor.userId }
    : { guestTokenHash: actor.guestTokenHash };

  return Cart.findOne(filter).select("+guestTokenHash");
};

const resumeCheckoutForKey = async (actor, idempotencyKey) => {
  const existing = await Order.findOne({ idempotencyKey, isActive: true }).select(
    "+guestAccessTokenHash +guestTokenHash +idempotencyKey"
  );

  if (!existing || existing.paymentStatus === "paid" || existing.paymentStatus === "refunded") {
    return null;
  }

  if (actor.userId && (!existing.user || existing.user.toString() !== actor.userId)) {
    await Order.updateOne(
      { _id: existing._id },
      { $set: { user: actor.userId, isGuest: false } }
    );
    await Payment.updateOne({ orderId: existing._id }, { $set: { userId: actor.userId } });
    existing.user = actor.userId;
    existing.isGuest = false;
  }

  const sameGuest =
    !actor.userId &&
    existing.guestTokenHash &&
    existing.guestTokenHash === actor.guestTokenHash;
  const sameUser = actor.userId && existing.user && existing.user.toString() === actor.userId;

  if (!sameGuest && !sameUser) {
    return null;
  }

  const payment = await Payment.findOne({ orderId: existing._id }).select("+guestTokenHash");
  if (!payment?.razorpayOrderId) {
    return null;
  }

  return checkoutResponse({
    order: existing,
    payment,
    guestOrderToken: "",
  });
};

const findIdempotentOrder = async (actor, idempotencyKey) => {
  if (!idempotencyKey) {
    return null;
  }

  const filter = {
    idempotencyKey,
    isActive: true,
    ...(actor.userId ? { user: actor.userId } : { guestTokenHash: actor.guestTokenHash }),
  };

  return Order.findOne(filter).select("+guestAccessTokenHash +guestTokenHash +idempotencyKey");
};

const checkoutResponse = async ({ order, payment, guestOrderToken }) => {
  const normalized = await normalizeOrderImages(order.toObject ? order.toObject() : order);

  return {
    order: normalized,
    ...(guestOrderToken ? { guestOrderToken } : {}),
    razorpay: {
      key: process.env.RAZORPAY_KEY_ID,
      orderId: payment.razorpayOrderId,
      amount: Math.round(Number(order.subtotalAmount) * 100),
      currency: "INR",
    },
    checkout: {
      oneClickCheckout: true,
      script: "https://checkout.razorpay.com/v1/magic-checkout.js",
      name: process.env.CHECKOUT_BUSINESS_NAME || "Kaka Dikro",
      showCoupons: false,
    },
  };
};

export const startMagicCheckout = async (actor, payload = {}, idempotencyKey = "") => {
  const key = String(idempotencyKey || "").trim();

  try {
    rejectClientPricing(payload);
    if (key && !/^[A-Za-z0-9_-]{8,80}$/.test(key)) {
      throw badRequest("Idempotency key is invalid");
    }

    if (actor?.userId) {
      ensureValidObjectId(actor.userId, "user");
    } else if (!actor?.guestTokenHash) {
      throw forbidden("A cart session is required for checkout");
    }

    const existing = await findIdempotentOrder(actor, key);
    if (existing) {
      const payment = await Payment.findOne({ orderId: existing._id }).select("+guestTokenHash");
      if (!payment?.razorpayOrderId) {
        throw badRequest("Checkout could not be resumed");
      }

      return checkoutResponse({
        order: existing,
        payment,
        guestOrderToken: "",
      });
    }

    const cart = ensureFound(await loadCart(actor), "Cart not found");
    if (!Array.isArray(cart.items) || cart.items.length === 0) {
      throw badRequest("Cart is empty");
    }

    const productIds = cart.items.map((item) => item.product);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });
    const productMap = new Map(products.map((product) => [product.id, product]));

    const orderItems = cart.items.map((item) => {
      const productId = item.product.toString();
      const product = ensureFound(productMap.get(productId), `Product not found for id ${productId}`);
      const variant = findVariantByWeight(product, item.weight);

      if (!variant) {
        throw badRequest(
          `Variant '${item.weight}' is not available for product '${product.name}'`
        );
      }

      if (variant.stock < item.quantity) {
        throw badRequest(
          `Insufficient stock for '${product.name}' (${item.weight}). Available stock is ${variant.stock}.`
        );
      }

      return buildOrderItem(product, variant, item.quantity);
    });

    const totals = calculateTotals(orderItems, {
      shippingAmount: 0,
      taxAmount: 0,
      discountAmount: 0,
    });

    const guestOrderToken = actor.userId ? "" : generateGuestToken();
    const customer = payload.customer || {};
    const order = await Order.create({
      ...(actor.userId ? { user: actor.userId } : {}),
      isGuest: !actor.userId,
      guestContact: {
        name: customer.name || "",
        email: customer.email || "",
        phone: "",
      },
      phoneVerified: false,
      ...(actor.guestTokenHash ? { guestTokenHash: actor.guestTokenHash } : {}),
      ...(guestOrderToken ? { guestAccessTokenHash: hashGuestToken(guestOrderToken) } : {}),
      ...(key ? { idempotencyKey: key } : {}),
      items: orderItems,
      shippingAddress: {
        fullName: customer.name || "",
        phone: "",
        country: "India",
      },
      paymentMethod: "upi",
      paymentStatus: "pending",
      orderStatus: "pending",
      ...totals,
    });

    const amountInPaise = Math.round(totals.subtotalAmount * 100);
    if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
      await Order.deleteOne({ _id: order._id });
      throw badRequest("Order amount is invalid for payment");
    }

    let paymentOrder;
    let payment;

    try {
      const razorpay = getRazorpayInstance();
      paymentOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: String(order._id).slice(0, 40),
        line_items_total: amountInPaise,
        line_items: buildLineItems(orderItems, productMap),
        notes: {
          orderId: order._id.toString(),
          checkout: "magic",
          guest: actor.userId ? "false" : "true",
        },
      });

      payment = await Payment.create({
        orderId: order._id,
        ...(actor.userId ? { userId: actor.userId } : {}),
        ...(actor.guestTokenHash ? { guestTokenHash: actor.guestTokenHash } : {}),
        razorpayOrderId: paymentOrder.id,
        amount: totals.subtotalAmount,
        status: "pending",
      });
    } catch (error) {
      await Payment.deleteOne({ orderId: order._id });
      await Order.deleteOne({ _id: order._id });
      throw error;
    }

    return checkoutResponse({ order, payment, guestOrderToken });
  } catch (error) {
    if (error?.code === 11000 && key) {
      const resumed = await resumeCheckoutForKey(actor, key);
      if (resumed) {
        return resumed;
      }
    }

    rethrowOrderServiceError(error, "Failed to start checkout");
  }
};

export const readIdempotencyKey = (req) =>
  String(req.get("idempotency-key") || req.get("Idempotency-Key") || "").trim();

export const readGuestOrderToken = (req) => {
  const token = String(req.get("x-guest-order-token") || "").trim();
  if (!token || !isGuestToken(token)) {
    return "";
  }

  return token;
};

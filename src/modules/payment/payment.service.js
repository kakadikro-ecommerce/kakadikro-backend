import crypto from "crypto";
import Payment from "./payment.model.js";
import Order from "../order/order.model.js";
import * as cartService from "../cart/cart.service.js";
import {
  attachOrderRelations,
  normalizeOrderImages,
} from "../order/order.helpers.js";
import {
  badRequest,
  ensureFound,
  ensureValidObjectId,
  forbidden,
} from "../../shared/errors/http-error.js";
import {
  buildPaginationMeta,
  normalizePagination,
} from "../../shared/utils/pagination.js";
import {
  getRazorpayInstance,
  isOnlineOrderPayment,
  rethrowPaymentServiceError,
  SUPPORTED_WEBHOOK_EVENTS,
} from "./payment.helpers.js";
import {
  reconcilePaidAmount,
  shouldMarkOrderPaid,
} from "../checkout/shipping-info.js";
import { guestTokensMatch } from "../checkout/guest-token.js";
import { normalizeCheckoutEmail } from "../checkout/claim-guest-checkout.js";

const loadNormalizedOrder = async (orderId) => {
  const order = await attachOrderRelations(Order.findById(orderId));
  if (!order) {
    return null;
  }

  return normalizeOrderImages(order.toObject ? order.toObject() : order);
};

const clearCartAfterSuccessfulPayment = async (payment) => {
  try {
    if (payment?.userId) {
      await cartService.clearCart(payment.userId.toString());
      return;
    }

    if (payment?.guestTokenHash) {
      await cartService.clearCart({ guestTokenHash: payment.guestTokenHash });
    }
  } catch {
    // Payment success must not fail if cart cleanup has an issue.
  }
};

const readRazorpayAddress = (remoteOrder) => {
  const details = remoteOrder?.customer_details || {};
  const address = details.shipping_address || details.billing_address || null;
  const line1 = String(address?.line1 || "").trim();

  if (!line1) {
    return null;
  }

  return {
    fullName: String(address.name || "").trim(),
    phone: String(address.contact || details.contact || "").trim(),
    addressLine1: line1,
    addressLine2: String(address.line2 || "").trim(),
    city: String(address.city || "").trim(),
    state: String(address.state || "").trim(),
    postalCode: String(address.zipcode || "").trim(),
    country: String(address.country || "India").trim() || "India",
    email: String(details.email || "").trim(),
  };
};

const applyRazorpayShipping = async (order, razorpayOrderId) => {
  if (!order || !razorpayOrderId) {
    return;
  }

  try {
    const remoteOrder = await getRazorpayInstance().orders.fetch(razorpayOrderId);
    const address = readRazorpayAddress(remoteOrder);
    if (!address) {
      return;
    }

    const verifiedPhone = order.phoneVerified
      ? order.guestContact?.phone || order.shippingAddress?.phone || address.phone
      : address.phone;

    order.shippingAddress = {
      fullName: address.fullName,
      phone: verifiedPhone || "",
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
    };
    order.guestContact = {
      name: address.fullName || order.guestContact?.name || "",
      email:
        normalizeCheckoutEmail(address.email) ||
        order.guestContact?.email ||
        "",
      phone: verifiedPhone || order.guestContact?.phone || "",
    };
    order.markModified("shippingAddress");
  } catch {
    // A captured payment must still be recorded if Razorpay order details are unavailable.
  }
};

const applyVerifiedContact = (order, paymentEntity) => {
  const contact = String(paymentEntity?.contact || "").trim();
  const email = normalizeCheckoutEmail(paymentEntity?.email);

  if (!contact && !email) {
    return;
  }

  order.guestContact = {
    name: order.guestContact?.name || "",
    email: email || order.guestContact?.email || "",
    phone: contact || order.guestContact?.phone || "",
  };

  if (contact) {
    order.phoneVerified = true;
    order.shippingAddress = {
      ...(order.shippingAddress?.toObject?.() || order.shippingAddress || {}),
      phone: contact,
    };
    order.markModified("shippingAddress");
  }
};

const applyCustomerToPayment = (payment, order, paymentEntity = null) => {
  if (!payment) {
    return;
  }

  const name = String(
    order?.guestContact?.name ||
      order?.shippingAddress?.fullName ||
      paymentEntity?.card?.name ||
      payment.customerName ||
      ""
  ).trim();
  const email = normalizeCheckoutEmail(
    paymentEntity?.email || order?.guestContact?.email || payment.customerEmail
  );
  const phone = String(
    paymentEntity?.contact ||
      order?.guestContact?.phone ||
      order?.shippingAddress?.phone ||
      payment.customerPhone ||
      ""
  ).trim();

  if (name) {
    payment.customerName = name;
  }
  if (email) {
    payment.customerEmail = email;
  }
  if (phone) {
    payment.customerPhone = phone;
  }
};

const applyCapturedAmount = (order, payment, paymentEntity) => {
  const amountPaise = Number(paymentEntity?.amount);
  if (!Number.isFinite(amountPaise)) {
    return;
  }

  reconcilePaidAmount(order, amountPaise);
  payment.amount = Number(order.totalAmount);
};

const markOrderPaid = async (order) => {
  if (!order) {
    return null;
  }

  if (order.paymentStatus !== "paid") {
    order.paymentStatus = "paid";
  }

  if (!order.paidAt) {
    order.paidAt = new Date();
  }

  await order.save();
  return order;
};

const markOrderFailed = async (order) => {
  if (!order) {
    return null;
  }

  // Do not downgrade an already-paid order
  if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") {
    return order;
  }

  order.paymentStatus = "failed";
  await order.save();
  return order;
};

export const recordCodPaymentReceived = async (order) => {
  const existing = await Payment.findOne({ orderId: order._id });

  if (existing) {
    if (existing.status !== "success" && existing.status !== "refunded") {
      existing.status = "success";
      existing.amount = Number(order.totalAmount);
      await existing.save();
    }

    return existing;
  }

  return Payment.create({
    orderId: order._id,
    userId: order.user,
    amount: Number(order.totalAmount),
    status: "success",
  });
};

const findPaymentByRazorpayOrderId = async (razorpayOrderId) => {
  if (!razorpayOrderId) {
    return null;
  }

  return Payment.findOne({ razorpayOrderId }).select("+guestTokenHash");
};

const applySuccessfulPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
  paymentEntity,
}) => {
  const payment = await findPaymentByRazorpayOrderId(razorpayOrderId);

  if (!payment) {
    return { handled: false, reason: "payment_not_found" };
  }

  const wasAlreadySuccess =
    payment.status === "success" || payment.status === "refunded";

  if (razorpayPaymentId) {
    payment.razorpayPaymentId = razorpayPaymentId;
  }

  const isCod = String(paymentEntity?.method || "").toLowerCase() === "cod";

  // Idempotent — already captured/verified
  if (!isCod && payment.status !== "success" && payment.status !== "refunded") {
    payment.status = "success";
  }

  await payment.save();

  const order = await Order.findById(payment.orderId);
  if (order) {
    applyVerifiedContact(order, paymentEntity);
    await applyRazorpayShipping(order, razorpayOrderId);
    applyCapturedAmount(order, payment, paymentEntity);
    applyCustomerToPayment(payment, order, paymentEntity);

    if (String(paymentEntity?.method || "").toLowerCase() === "cod") {
      order.paymentMethod = "cod";
    }

    if (shouldMarkOrderPaid(paymentEntity)) {
      await markOrderPaid(order);
    } else {
      await order.save();
    }

    await payment.save();
  }

  if (!wasAlreadySuccess) {
    await clearCartAfterSuccessfulPayment(payment);
  }

  return { handled: true, payment, order };
};

const applyFailedPayment = async ({ razorpayOrderId, razorpayPaymentId }) => {
  const payment = await findPaymentByRazorpayOrderId(razorpayOrderId);

  if (!payment) {
    return { handled: false, reason: "payment_not_found" };
  }

  // Do not overwrite a successful or refunded payment
  if (payment.status === "success" || payment.status === "refunded") {
    return { handled: true, payment, skipped: true };
  }

  if (razorpayPaymentId) {
    payment.razorpayPaymentId = razorpayPaymentId;
  }

  payment.status = "failed";
  await payment.save();

  const order = await Order.findById(payment.orderId);
  await markOrderFailed(order);

  return { handled: true, payment, order };
};

const applyAuthorizedPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
}) => {
  const payment = await findPaymentByRazorpayOrderId(razorpayOrderId);

  if (!payment) {
    return { handled: false, reason: "payment_not_found" };
  }

  if (razorpayPaymentId) {
    payment.razorpayPaymentId = razorpayPaymentId;
  }

  // Keep pending until capture / order.paid; only attach payment id
  if (payment.status === "pending") {
    await payment.save();
  }

  return { handled: true, payment };
};

const applyRefundUpdate = async ({
  razorpayPaymentId,
  razorpayRefundId,
  amount,
  status,
  notes = "",
}) => {
  let payment = null;

  if (razorpayPaymentId) {
    payment = await Payment.findOne({ razorpayPaymentId });
  }

  if (!payment && razorpayRefundId) {
    payment = await Payment.findOne({
      "refund.razorpayRefundId": razorpayRefundId,
    });
  }

  if (!payment) {
    return { handled: false, reason: "payment_not_found" };
  }

  const refundAmount =
    amount != null ? Number(amount) / 100 : payment.amount || 0;

  payment.refund = {
    razorpayRefundId: razorpayRefundId || payment.refund?.razorpayRefundId || "",
    amount: refundAmount,
    status: status || payment.refund?.status || "",
    refundedAt:
      status === "processed" || status === "refunded"
        ? new Date()
        : payment.refund?.refundedAt || null,
    notes: notes || payment.refund?.notes || "",
  };

  if (status === "processed" || status === "refunded") {
    payment.status = "refunded";

    const order = await Order.findById(payment.orderId);
    if (order && order.paymentStatus !== "refunded") {
      order.paymentStatus = "refunded";
      await order.save();
    }
  }

  await payment.save();

  return { handled: true, payment };
};

export const createPaymentOrder = async (userId, payload) => {
  try {
    ensureValidObjectId(userId, "user");
    ensureValidObjectId(payload.orderId, "order");

    const order = ensureFound(
      await Order.findById(payload.orderId),
      "Order not found"
    );

    if (!order.user || order.user.toString() !== userId) {
      throw forbidden("You are not allowed to create payment for this order");
    }

    if (order.paymentStatus === "paid") {
      throw badRequest("Payment already completed for this order");
    }

    if (order.orderStatus === "cancelled" || !order.isActive) {
      throw badRequest("This order is no longer available for payment");
    }

    if (!isOnlineOrderPayment(order.paymentMethod)) {
      throw badRequest(
        "Online payment is not available for cash on delivery orders"
      );
    }

    const amountInRupees = Number(order.totalAmount);
    if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
      throw badRequest("Order amount is invalid for payment");
    }

    const amountInPaise = Math.round(amountInRupees * 100);

    const razorpay = getRazorpayInstance();
    const lineItems = (order.items || []).map((item) => {
      const pricePaise = Math.round(Number(item.unitPrice) * 100);
      return {
        sku: String(item.product),
        variant_id: String(item.weight || item.product),
        price: pricePaise,
        offer_price: pricePaise,
        quantity: item.quantity,
        name: item.name,
        description: item.name,
      };
    });
    const paymentOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: String(order._id).slice(0, 40),
      line_items_total: Math.round(Number(order.subtotalAmount || order.totalAmount) * 100),
      line_items: lineItems,
      notes: {
        orderId: order._id.toString(),
        userId,
        checkout: "magic",
      },
    });

    const existingPayment = await Payment.findOne({
      orderId: order._id,
      userId,
    });

    if (existingPayment?.status === "success") {
      throw badRequest("Payment already completed for this order");
    }

    let payment;
    if (existingPayment) {
      existingPayment.razorpayOrderId = paymentOrder.id;
      existingPayment.amount = amountInRupees;
      existingPayment.status = "pending";
      existingPayment.razorpayPaymentId = "";
      payment = await existingPayment.save();
    } else {
      payment = await Payment.create({
        orderId: order._id,
        userId,
        razorpayOrderId: paymentOrder.id,
        amount: amountInRupees,
        status: "pending",
      });
    }

    return {
      payment,
      order: {
        id: order._id.toString(),
        totalAmount: amountInRupees,
      },
      razorpay: {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency || "INR",
      },
      checkout: {
        oneClickCheckout: true,
        script: "https://checkout.razorpay.com/v1/magic-checkout.js",
        name: process.env.CHECKOUT_BUSINESS_NAME || "Kaka Dikro",
        showCoupons: false,
      },
    };
  } catch (error) {
    rethrowPaymentServiceError(error, "Unable to start payment. Please try again.");
  }
};

const applyClientAddress = (order, address) => {
  if (!address) {
    return;
  }

  const verifiedPhone = order.phoneVerified ? order.guestContact?.phone || order.shippingAddress?.phone : "";

  order.shippingAddress = {
    ...(order.shippingAddress?.toObject?.() || order.shippingAddress || {}),
    ...address,
    phone: verifiedPhone || "",
  };
  order.markModified("shippingAddress");

  if (address.fullName && !order.guestContact?.name) {
    order.guestContact = {
      ...(order.guestContact?.toObject?.() || order.guestContact || {}),
      name: address.fullName,
    };
  }
};

export const verifyPayment = async (userId, payload, guestOrderToken = "") => {
  try {
    getRazorpayInstance();

    const paymentQuery = { razorpayOrderId: payload.razorpayOrderId };
    if (userId) {
      ensureValidObjectId(userId, "user");
      paymentQuery.userId = userId;
    }

    const payment = ensureFound(
      await Payment.findOne(paymentQuery).select("+guestTokenHash"),
      "Payment record not found"
    );

    const order = ensureFound(
      await Order.findById(payment.orderId).select("+guestAccessTokenHash +guestTokenHash"),
      "Order not found"
    );

    if (userId) {
      if (!order.user || order.user.toString() !== userId) {
        throw forbidden("You are not allowed to verify payment for this order");
      }
    } else if (!guestTokensMatch(order.guestAccessTokenHash, guestOrderToken)) {
      throw forbidden("You are not allowed to verify payment for this order");
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== payload.razorpaySignature) {
      payment.status = "failed";
      payment.razorpayPaymentId = payload.razorpayPaymentId;
      await payment.save();
      throw badRequest("Payment verification failed. Please try again.");
    }

    const wasAlreadySuccess = payment.status === "success";

    let remotePayment = null;
    try {
      remotePayment = await getRazorpayInstance().payments.fetch(payload.razorpayPaymentId);
    } catch {
      remotePayment = null;
    }

    const isCod = String(remotePayment?.method || "").toLowerCase() === "cod";

    payment.razorpayPaymentId = payload.razorpayPaymentId;
    if (!isCod) {
      payment.status = "success";
    }
    await payment.save();

    applyVerifiedContact(order, remotePayment);
    await applyRazorpayShipping(order, payload.razorpayOrderId);
    applyCapturedAmount(order, payment, remotePayment);
    applyClientAddress(order, payload.shippingAddress);
    applyCustomerToPayment(payment, order, remotePayment);

    if (isCod) {
      order.paymentMethod = "cod";
      await order.save();
    } else {
      await markOrderPaid(order);
    }

    await payment.save();

    if (!wasAlreadySuccess) {
      await clearCartAfterSuccessfulPayment(payment);
    }

    const normalizedOrder = await loadNormalizedOrder(order._id);

    return {
      payment,
      order: normalizedOrder || order,
    };
  } catch (error) {
    rethrowPaymentServiceError(
      error,
      "Unable to verify payment. Please try again."
    );
  }
};

export const getAllPaymentsAdmin = async (query = {}) => {
  try {
    const { page, limit, skip } = normalizePagination(query);
    const filter = {};

    if (query.status) {
      filter.status = String(query.status).trim().toLowerCase();
    }

    const [payments, total, summaryAgg] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({
          path: "orderId",
          select:
            "_id totalAmount paymentMethod paymentStatus orderStatus placedAt guestContact shippingAddress",
        })
        .populate({
          path: "userId",
          select: "name email phone",
        }),
      Payment.countDocuments(filter),
      Payment.aggregate([
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            successfulCount: {
              $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
            },
            successfulAmount: {
              $sum: { $cond: [{ $eq: ["$status", "success"] }, "$amount", 0] },
            },
          },
        },
      ]),
    ]);

    const totals = summaryAgg[0] || {};

    const paymentsWithCustomer = payments.map((payment) => {
      const obj = payment.toObject ? payment.toObject() : payment;
      const guest = obj.orderId?.guestContact || {};
      const shipping = obj.orderId?.shippingAddress || {};

      return {
        ...obj,
        customerName:
          obj.customerName || guest.name || shipping.fullName || "",
        customerEmail: obj.customerEmail || guest.email || "",
        customerPhone:
          obj.customerPhone || guest.phone || shipping.phone || "",
      };
    });

    return {
      pagination: buildPaginationMeta({ total, page, limit }),
      payments: paymentsWithCustomer,
      summary: {
        totalPayments: totals.totalPayments || 0,
        successfulCount: totals.successfulCount || 0,
        successfulAmount: totals.successfulAmount || 0,
      },
    };
  } catch (error) {
    rethrowPaymentServiceError(error, "Failed to fetch payments");
  }
};

/**
 * Verify Razorpay webhook signature using the raw request body.
 * @param {Buffer|string} rawBody
 * @param {string} signature - X-Razorpay-Signature header
 */
export const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    throw badRequest("Payment webhook is not configured");
  }

  if (!signature) {
    throw badRequest("Missing payment webhook signature");
  }

  const body =
    Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ""), "utf8");

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const provided = Buffer.from(String(signature));
  const expected = Buffer.from(expectedSignature);

  if (
    provided.length !== expected.length ||
    !crypto.timingSafeEqual(provided, expected)
  ) {
    throw badRequest("Invalid payment webhook signature");
  }

  return true;
};

export const handleRazorpayWebhook = async (eventPayload) => {
  try {
    const event = eventPayload?.event;

    if (!event) {
      throw badRequest("Invalid webhook payload");
    }

    if (!SUPPORTED_WEBHOOK_EVENTS.includes(event)) {
      return { handled: false, ignored: true, event };
    }

    const paymentEntity = eventPayload?.payload?.payment?.entity;
    const orderEntity = eventPayload?.payload?.order?.entity;
    const refundEntity = eventPayload?.payload?.refund?.entity;

    switch (event) {
      case "payment.authorized":
        return {
          event,
          ...(await applyAuthorizedPayment({
            razorpayOrderId: paymentEntity?.order_id,
            razorpayPaymentId: paymentEntity?.id,
          })),
        };

      case "payment.captured":
        return {
          event,
          ...(await applySuccessfulPayment({
            razorpayOrderId: paymentEntity?.order_id,
            razorpayPaymentId: paymentEntity?.id,
            paymentEntity,
          })),
        };

      case "order.paid":
        return {
          event,
          ...(await applySuccessfulPayment({
            razorpayOrderId: orderEntity?.id || paymentEntity?.order_id,
            razorpayPaymentId: paymentEntity?.id,
            paymentEntity,
          })),
        };

      case "payment.failed":
        return {
          event,
          ...(await applyFailedPayment({
            razorpayOrderId: paymentEntity?.order_id,
            razorpayPaymentId: paymentEntity?.id,
          })),
        };

      case "refund.created":
        return {
          event,
          ...(await applyRefundUpdate({
            razorpayPaymentId: refundEntity?.payment_id || paymentEntity?.id,
            razorpayRefundId: refundEntity?.id,
            amount: refundEntity?.amount,
            status: refundEntity?.status || "created",
            notes: "Refund initiated",
          })),
        };

      case "refund.processed":
        return {
          event,
          ...(await applyRefundUpdate({
            razorpayPaymentId: refundEntity?.payment_id || paymentEntity?.id,
            razorpayRefundId: refundEntity?.id,
            amount: refundEntity?.amount,
            status: "processed",
            notes: "Refund processed",
          })),
        };

      case "refund.failed":
        return {
          event,
          ...(await applyRefundUpdate({
            razorpayPaymentId: refundEntity?.payment_id || paymentEntity?.id,
            razorpayRefundId: refundEntity?.id,
            amount: refundEntity?.amount,
            status: "failed",
            notes: "Refund failed",
          })),
        };

      default:
        return { handled: false, ignored: true, event };
    }
  } catch (error) {
    rethrowPaymentServiceError(
      error,
      "Unable to process payment webhook"
    );
  }
};

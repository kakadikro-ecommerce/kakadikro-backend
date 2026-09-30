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

const loadNormalizedOrder = async (orderId) => {
  const order = await attachOrderRelations(Order.findById(orderId));
  if (!order) {
    return null;
  }

  return normalizeOrderImages(order.toObject ? order.toObject() : order);
};

const clearCartAfterSuccessfulPayment = async (userId) => {
  if (!userId) {
    return;
  }

  try {
    await cartService.clearCart(userId.toString());
  } catch {
    // Payment success must not fail if cart cleanup has an issue.
  }
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

const findPaymentByRazorpayOrderId = async (razorpayOrderId) => {
  if (!razorpayOrderId) {
    return null;
  }

  return Payment.findOne({ razorpayOrderId });
};

const applySuccessfulPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
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

  // Idempotent — already captured/verified
  if (payment.status !== "success" && payment.status !== "refunded") {
    payment.status = "success";
  }

  await payment.save();

  const order = await Order.findById(payment.orderId);
  await markOrderPaid(order);

  if (!wasAlreadySuccess) {
    await clearCartAfterSuccessfulPayment(payment.userId);
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

    if (order.user.toString() !== userId) {
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
    const paymentOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: String(order.orderNumber || order._id).slice(0, 40),
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber || "",
        userId,
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
        orderNumber: order.orderNumber || "",
        totalAmount: amountInRupees,
      },
      razorpay: {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency || "INR",
      },
    };
  } catch (error) {
    rethrowPaymentServiceError(error, "Unable to start payment. Please try again.");
  }
};

export const verifyPayment = async (userId, payload) => {
  try {
    ensureValidObjectId(userId, "user");
    getRazorpayInstance();

    const payment = ensureFound(
      await Payment.findOne({
        razorpayOrderId: payload.razorpayOrderId,
        userId,
      }),
      "Payment record not found"
    );

    const order = ensureFound(
      await Order.findById(payment.orderId),
      "Order not found"
    );

    if (order.user.toString() !== userId) {
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

    payment.razorpayPaymentId = payload.razorpayPaymentId;
    payment.status = "success";
    await payment.save();

    await markOrderPaid(order);

    if (!wasAlreadySuccess) {
      await clearCartAfterSuccessfulPayment(userId);
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

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({
          path: "orderId",
          select: "orderNumber totalAmount paymentMethod paymentStatus orderStatus",
        })
        .populate({
          path: "userId",
          select: "name email phone",
        }),
      Payment.countDocuments(filter),
    ]);

    return {
      pagination: buildPaginationMeta({ total, page, limit }),
      payments,
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
          })),
        };

      case "order.paid":
        return {
          event,
          ...(await applySuccessfulPayment({
            razorpayOrderId: orderEntity?.id || paymentEntity?.order_id,
            razorpayPaymentId: paymentEntity?.id,
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

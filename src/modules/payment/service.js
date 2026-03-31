import crypto from "crypto";
import Payment from "./model.js";
import Order from "../order/model.js";
import {
  badRequest,
  ensureFound,
  ensureValidObjectId,
  forbidden,
} from "../../shared/errors/http-error.js";
import {
  getRazorpayInstance,
  isOnlineOrderPayment,
  rethrowPaymentServiceError
} from "../payment/helpers.js"


export const createPaymentOrder = async (userId, payload) => {
  try {
    ensureValidObjectId(userId, "user");
    ensureValidObjectId(payload.orderId, "order");

    const order = ensureFound(await Order.findById(payload.orderId), "Order not found");

    if (order.user.toString() !== userId) {
      throw forbidden("You are not allowed to create payment for this order");
    }

    if (order.paymentStatus === "paid") {
      throw badRequest("Payment already completed for this order");
    }

    if (!isOnlineOrderPayment(order.paymentMethod)) {
      throw badRequest("Online payment is not available for cash on delivery orders");
    }

    const razorpay = getRazorpayInstance();
    const paymentOrder = await razorpay.orders.create({
      amount: Math.round(order.totalAmount * 100),
      currency: "INR",
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        userId,
      },
    });

    const payment = await Payment.findOneAndUpdate(
      { orderId: order._id, userId },
      {
        orderId: order._id,
        userId,
        razorpayOrderId: paymentOrder.id,
        amount: order.totalAmount,
        status: "pending",
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return {
      payment,
      razorpay: {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: paymentOrder.id,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
      },
    };
  } catch (error) {
    rethrowPaymentServiceError(error, "Failed to create payment order");
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

    const order = ensureFound(await Order.findById(payment.orderId), "Order not found");

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
      throw badRequest("Invalid payment signature");
    }

    payment.razorpayPaymentId = payload.razorpayPaymentId;
    payment.status = "success";
    await payment.save();

    order.paymentStatus = "paid";
    if (!order.paidAt) {
      order.paidAt = new Date();
    }
    await order.save();

    return {
      payment,
      order,
    };
  } catch (error) {
    rethrowPaymentServiceError(error, "Failed to verify payment");
  }
};

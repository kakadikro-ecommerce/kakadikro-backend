import Razorpay from "razorpay";
import { badRequest } from "../../shared/errors/http-error.js";
import AppError from "../../shared/errors/app-error.js";

export const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw badRequest(
      "Payment service is not configured. Please contact support."
    );
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

export const rethrowPaymentServiceError = (error, message) => {
  if (error instanceof AppError) {
    throw error;
  }

  if (error?.name === "ValidationError") {
    throw badRequest("Please check the payment details and try again");
  }

  const statusCode = error?.statusCode || error?.status || 500;
  const safeMessage =
    statusCode >= 500
      ? message
      : message || "Unable to process payment. Please try again.";

  throw new AppError(safeMessage, statusCode >= 400 ? statusCode : 500, null);
};

export const isOnlineOrderPayment = (paymentMethod) => paymentMethod !== "cod";

/**
 * Map Razorpay payment.method onto our Order.paymentMethod enum (cod | card | upi).
 * Unknown online methods fall back to "card" so we never leave a wrong hardcoded UPI.
 */
export const mapRazorpayPaymentMethod = (razorpayMethod) => {
  const method = String(razorpayMethod || "")
    .trim()
    .toLowerCase();

  if (!method) {
    return "";
  }

  if (method === "cod") {
    return "cod";
  }

  if (method === "upi") {
    return "upi";
  }

  if (method === "card") {
    return "card";
  }

  // netbanking, wallet, emi, paylater, etc. — treat as online card-class for our enum
  return "card";
};

export const SUPPORTED_WEBHOOK_EVENTS = [
  "payment.authorized",
  "payment.failed",
  "payment.captured",
  "order.paid",
  "refund.processed",
  "refund.failed",
  "refund.created",
];

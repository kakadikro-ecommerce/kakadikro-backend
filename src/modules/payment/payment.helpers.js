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

export const SUPPORTED_WEBHOOK_EVENTS = [
  "payment.authorized",
  "payment.failed",
  "payment.captured",
  "order.paid",
  "refund.processed",
  "refund.failed",
  "refund.created",
];

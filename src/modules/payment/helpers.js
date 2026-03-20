import Razorpay from "razorpay";
import { badRequest } from "../../shared/errors/http-error.js";
import AppError from "../../shared/errors/app-error.js";


export const getRazorpayInstance = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw badRequest("Razorpay credentials are not configured");
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
        throw badRequest("Payment validation failed", error.message);
    }

    const statusCode = error?.statusCode || error?.status || 500;
    throw new AppError(message, statusCode, error?.message || null);
};
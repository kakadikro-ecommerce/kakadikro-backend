import express from "express";
import * as paymentController from "./payment.controller.js";
import asyncHandler from "../../shared/http/async-handler.js";

/**
 * Public Razorpay webhook routes (no JWT).
 * Signature is verified inside the controller using RAZORPAY_WEBHOOK_SECRET.
 */
const router = express.Router();

router.post(
  "/razorpay",
  asyncHandler(paymentController.handleRazorpayWebhook)
);

export default router;

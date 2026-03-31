import express from "express";
import * as paymentController from "./controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import asyncHandler from "../../shared/http/async-handler.js";
import {
  createPaymentOrderValidation,
  verifyPaymentValidation,
} from "./validation.js";

const router = express.Router();

router.post(
  "/orders",
  validateRequest(createPaymentOrderValidation),
  asyncHandler(paymentController.createPaymentOrder)
);

router.post(
  "/verification",
  validateRequest(verifyPaymentValidation),
  asyncHandler(paymentController.verifyPayment)
);

export default router;

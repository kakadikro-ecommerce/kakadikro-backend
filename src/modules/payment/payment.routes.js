import express from "express";
import * as paymentController from "./payment.controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import asyncHandler from "../../shared/http/async-handler.js";
import {
  createPaymentOrderValidation,
  verifyPaymentValidation,
} from "./payment.validation.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.post(
  "/orders",
  protect,
  authorizeRoles("user"),
  validateRequest(createPaymentOrderValidation),
  asyncHandler(paymentController.createPaymentOrder)
);

router.post(
  "/verification",
  protect,
  authorizeRoles("user"),
  validateRequest(verifyPaymentValidation),
  asyncHandler(paymentController.verifyPayment)
);

export default router;

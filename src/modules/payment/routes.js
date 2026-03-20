import express from "express";
import * as paymentController from "./controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import asyncHandler from "../../shared/http/async-handler.js";
import {
  createPaymentOrderValidation,
  verifyPaymentValidation,
} from "./validation.js";

const router = express.Router();

router.use(protect, authorizeRoles("user"));

router.post(
  "/create-order",
  validateRequest(createPaymentOrderValidation),
  asyncHandler(paymentController.createPaymentOrder)
);

router.post(
  "/verify",
  validateRequest(verifyPaymentValidation),
  asyncHandler(paymentController.verifyPayment)
);

export default router;

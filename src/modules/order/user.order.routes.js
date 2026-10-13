import express from "express";
import rateLimit from "express-rate-limit";
import * as orderController from "./order.controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import asyncHandler from "../../shared/http/async-handler.js";
import { createOrderValidation } from "./order.validation.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

const guestOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many order lookups. Please try again later.",
  },
});

router.get("/guest", guestOrderLimiter, asyncHandler(orderController.getGuestOrder));

router.post("/", protect, authorizeRoles("user"), validateRequest(createOrderValidation), asyncHandler(orderController.createOrder));

router.get("/", protect, authorizeRoles("user"), asyncHandler(orderController.getMyOrders));

router.get("/tracking/:id", protect, authorizeRoles("user"), asyncHandler(orderController.trackOrder));

router.put("/:id", protect, authorizeRoles("user"), asyncHandler(orderController.updateMyOrder));

router.put("/cancel/:id", protect, authorizeRoles("user"), asyncHandler(orderController.cancelOrder));

export default router;

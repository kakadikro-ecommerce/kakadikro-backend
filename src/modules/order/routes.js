import express from "express";
import * as orderController from "./controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import asyncHandler from "../../shared/http/async-handler.js";
import {
  createOrderValidation,
  updateOrderStatusValidation,
} from "./validation.js";

const router = express.Router();

router.use(protect);

router.post(
  "/",
  authorizeRoles("user"),
  validateRequest(createOrderValidation),
  asyncHandler(orderController.createOrder)
);

router.get(
  "/my-orders",
  authorizeRoles("user"),
  asyncHandler(orderController.getMyOrders)
);

router.get("/:id", asyncHandler(orderController.getOrderById));

router.get(
  "/",
  authorizeRoles("admin"),
  asyncHandler(orderController.getAllOrders)
);

router.patch(
  "/status/:id",
  authorizeRoles("admin"),
  validateRequest(updateOrderStatusValidation),
  asyncHandler(orderController.updateOrderStatus)
);

export default router;

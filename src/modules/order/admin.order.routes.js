import express from "express";
import * as orderController from "./order.controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import asyncHandler from "../../shared/http/async-handler.js";
import {
  updateOrderActiveStatusValidation,
  updateOrderStatusValidation,
} from "./order.validation.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin", "super_admin"), asyncHandler(orderController.getAllOrders));

router.get("/:id", protect, authorizeRoles("admin", "super_admin"), asyncHandler(orderController.getOrderById));

router.put(
  "/status/:id",
  validateRequest(updateOrderStatusValidation),
  protect,
  authorizeRoles("admin", "super_admin"),
  asyncHandler(orderController.updateOrderStatus)
);

router.put(
  "/active/:id",
  validateRequest(updateOrderActiveStatusValidation),
  protect,
  authorizeRoles("admin", "super_admin"),
  asyncHandler(orderController.updateOrderActiveStatus)
);

export default router;

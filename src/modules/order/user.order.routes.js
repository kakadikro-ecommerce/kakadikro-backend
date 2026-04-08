import express from "express";
import * as orderController from "./order.controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import asyncHandler from "../../shared/http/async-handler.js";
import { createOrderValidation } from "./order.validation.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("user"), validateRequest(createOrderValidation), asyncHandler(orderController.createOrder));

router.get("/", protect, authorizeRoles("user"), asyncHandler(orderController.getMyOrders));

router.get("/tracking/:id", protect, authorizeRoles("user"), asyncHandler(orderController.trackOrder));

router.put("/:id", protect, authorizeRoles("user"), asyncHandler(orderController.updateMyOrder));

router.put("/cancel/:id", protect, authorizeRoles("user"), asyncHandler(orderController.cancelOrder));

export default router;

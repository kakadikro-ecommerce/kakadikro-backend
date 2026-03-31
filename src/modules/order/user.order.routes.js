import express from "express";
import * as orderController from "./controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import asyncHandler from "../../shared/http/async-handler.js";
import { createOrderValidation } from "./validation.js";

const router = express.Router();

router.post(
  "/",
  validateRequest(createOrderValidation),
  asyncHandler(orderController.createOrder)
);

router.get("/", asyncHandler(orderController.getMyOrders));

router.get("/tracking/:orderNumber", asyncHandler(orderController.trackOrder));

router.put("/:id", asyncHandler(orderController.updateMyOrder));

router.put("/cancel/:id", asyncHandler(orderController.cancelOrder));

export default router;

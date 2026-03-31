import express from "express";
import * as orderController from "./controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import asyncHandler from "../../shared/http/async-handler.js";
import { updateOrderStatusValidation } from "./validation.js";

const router = express.Router();

router.get("/", asyncHandler(orderController.getAllOrders));

router.get("/:id", asyncHandler(orderController.getOrderById));

router.put(
  "/status/:id",
  validateRequest(updateOrderStatusValidation),
  asyncHandler(orderController.updateOrderStatus)
);

router.delete("/:id", asyncHandler(orderController.deleteOrder));

export default router;

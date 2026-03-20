import express from "express";
import * as cartController from "./controller.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import validateRequest from "../../middlewares/validate-request.js";
import asyncHandler from "../../shared/http/async-handler.js";
import {
  addCartItemValidation,
  updateCartItemValidation,
} from "./validation.js";

const router = express.Router();

router.use(protect, authorizeRoles("user"));

router.get("/", asyncHandler(cartController.getMyCart));

router.post(
  "/items",
  validateRequest(addCartItemValidation),
  asyncHandler(cartController.addItemToCart)
);

router.patch(
  "/items/:itemId",
  validateRequest(updateCartItemValidation),
  asyncHandler(cartController.updateCartItemQuantity)
);

router.delete("/items/:itemId", asyncHandler(cartController.removeCartItem));

router.delete("/", asyncHandler(cartController.clearCart));

export default router;

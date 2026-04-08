import express from "express";
import * as cartController from "./cart.controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import asyncHandler from "../../shared/http/async-handler.js";
import {
  addCartItemValidation,
  updateCartItemValidation,
} from "./cart.validation.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("user"), asyncHandler(cartController.getMyCart));

router.post("/items", protect, authorizeRoles("user"), validateRequest(addCartItemValidation), asyncHandler(cartController.addItemToCart));

router.put("/items/:itemId", protect, authorizeRoles("user"), validateRequest(updateCartItemValidation), asyncHandler(cartController.updateCartItemQuantity));

router.delete("/items/:itemId", protect, authorizeRoles("user"), asyncHandler(cartController.removeCartItem));

router.delete("/", protect, authorizeRoles("user"), asyncHandler(cartController.clearCart));

export default router;

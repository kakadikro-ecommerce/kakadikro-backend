import express from "express";
import * as paymentController from "./payment.controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import asyncHandler from "../../shared/http/async-handler.js";
import {
  createPaymentOrderValidation,
  verifyPaymentValidation,
} from "./payment.validation.js";
import rateLimit from "express-rate-limit";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import { optionalProtect } from "../../middlewares/optional-auth.js";
import { attachCartActor } from "../../middlewares/guest-cart.js";
import { magicCheckoutValidation } from "../checkout/checkout.validation.js";
import * as checkoutController from "../checkout/checkout.controller.js";
import { rejectClientPricing } from "../checkout/magic-checkout.service.js";

const rejectCheckoutPricing = (req, res, next) => {
  try {
    rejectClientPricing(req.body || {});
    return next();
  } catch (error) {
    return next(error);
  }
};

const router = express.Router();

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many checkout attempts. Please try again later.",
  },
});

const shippingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/magic/shipping-info",
  shippingLimiter,
  asyncHandler(checkoutController.shippingInfo)
);

router.get(
  "/magic/shipping-info",
  shippingLimiter,
  asyncHandler(checkoutController.shippingInfo)
);

router.post("/magic/promotions", asyncHandler(checkoutController.promotions));
router.get("/magic/promotions", asyncHandler(checkoutController.promotions));

router.post(
  "/magic-checkout",
  checkoutLimiter,
  optionalProtect,
  attachCartActor,
  rejectCheckoutPricing,
  validateRequest(magicCheckoutValidation),
  asyncHandler(checkoutController.startMagicCheckout)
);

router.post(
  "/orders",
  protect,
  authorizeRoles("user"),
  validateRequest(createPaymentOrderValidation),
  asyncHandler(paymentController.createPaymentOrder)
);

router.post(
  "/verification",
  checkoutLimiter,
  optionalProtect,
  validateRequest(verifyPaymentValidation),
  asyncHandler(paymentController.verifyPayment)
);

export default router;

import { generateAccessToken } from "../../shared/auth/token.service.js";
import { unauthorized } from "../../shared/errors/http-error.js";
import { hashGuestToken, isGuestToken } from "../checkout/guest-token.js";
import { mergeGuestCart } from "../cart/cart.service.js";
import Order from "../order/order.model.js";
import Payment from "../payment/payment.model.js";
import * as authService from "./auth.service.js";

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

export const registerUser = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const result = await authService.loginUser(req.body);
    const user = result.userDocument;

    if (!user) {
      throw unauthorized("Unauthorized");
    }

    const accessToken = generateAccessToken(user);
    const guestCartToken = String(req.get("x-guest-cart-token") || "").trim();
    const guestOrderToken = String(req.get("x-guest-order-token") || "").trim();

    if (isGuestToken(guestCartToken)) {
      const guestTokenHash = hashGuestToken(guestCartToken);
      await mergeGuestCart(user._id, guestTokenHash);
      await Order.updateMany(
        { guestTokenHash, isActive: true, paymentStatus: { $ne: "paid" } },
        { $set: { user: user._id, isGuest: false } }
      );
      await Payment.updateMany({ guestTokenHash }, { $set: { userId: user._id } });
    }

    if (isGuestToken(guestOrderToken)) {
      await Order.updateOne(
        { guestAccessTokenHash: hashGuestToken(guestOrderToken), isActive: true },
        { $set: { user: user._id, isGuest: false } }
      );
    }

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        accessToken,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return next(error);
  }
};
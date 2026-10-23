import { generateAccessToken } from "../../shared/auth/token.service.js";
import { unauthorized } from "../../shared/errors/http-error.js";
import {
  hashGuestToken,
  isGuestToken,
} from "../checkout/guest-token.js";
import {
  claimGuestCheckoutByEmail,
  claimGuestOrderByAccessToken,
  claimUnpaidGuestSession,
} from "../checkout/claim-guest-checkout.js";
import { mergeGuestCart } from "../cart/cart.service.js";
import * as authService from "./auth.service.js";

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
});

const attachGuestCheckoutToUser = async (user, req) => {
  const guestCartToken = String(req.get("x-guest-cart-token") || "").trim();
  const guestOrderToken = String(req.get("x-guest-order-token") || "").trim();

  if (isGuestToken(guestCartToken)) {
    await mergeGuestCart(user._id, hashGuestToken(guestCartToken));
    await claimUnpaidGuestSession(user, guestCartToken);
  }

  if (isGuestToken(guestOrderToken)) {
    await claimGuestOrderByAccessToken(user, guestOrderToken);
  }

  // History for guest Magic Checkout: same email used at Razorpay checkout
  await claimGuestCheckoutByEmail(user);
};

export const registerUser = async (req, res, next) => {
  try {
    const result = await authService.registerUser(req.body);
    const user = result.userDocument;

    if (user) {
      await attachGuestCheckoutToUser(user, req);
    }

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: result.user,
      },
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
    await attachGuestCheckoutToUser(user, req);

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

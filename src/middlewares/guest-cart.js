import { forbidden } from "../shared/errors/http-error.js";
import {
  generateGuestToken,
  hashGuestToken,
  isGuestToken,
} from "../modules/checkout/guest-token.js";

const readGuestCartToken = (req) =>
  String(req.get("x-guest-cart-token") || req.get("X-Guest-Cart-Token") || "").trim();

export const attachCartActor = (req, res, next) => {
  if (req.user && req.user.role !== "user") {
    return next(forbidden("You do not have permission to use the customer cart"));
  }

  if (req.user?.role === "user") {
    req.cartActor = { userId: req.user.id || req.user._id.toString() };
    return next();
  }

  const presented = readGuestCartToken(req);
  if (presented) {
    if (!isGuestToken(presented)) {
      return next(forbidden("The cart session is not valid"));
    }

    req.cartActor = {
      guestToken: presented,
      guestTokenHash: hashGuestToken(presented),
      issued: false,
    };
    return next();
  }

  const guestToken = generateGuestToken();
  res.setHeader("X-Guest-Cart-Token", guestToken);
  req.cartActor = {
    guestToken,
    guestTokenHash: hashGuestToken(guestToken),
    issued: true,
  };
  return next();
};

import { badRequest } from "../../shared/errors/http-error.js";
import { buildShippingInfoResponse } from "./shipping-info.js";
import * as magicCheckoutService from "./magic-checkout.service.js";

export const startMagicCheckout = async (req, res, next) => {
  try {
    const result = await magicCheckoutService.startMagicCheckout(
      req.cartActor,
      req.body,
      magicCheckoutService.readIdempotencyKey(req)
    );

    if (result.guestOrderToken) {
      res.setHeader("X-Guest-Order-Token", result.guestOrderToken);
    }

    if (req.cartActor?.issued && req.cartActor.guestToken) {
      res.setHeader("X-Guest-Cart-Token", req.cartActor.guestToken);
    }

    return res.status(201).json({
      success: true,
      message: "Magic Checkout started",
      ...(req.cartActor?.issued && req.cartActor.guestToken
        ? { guestCartToken: req.cartActor.guestToken }
        : {}),
      data: result,
    });
  } catch (error) {
    return next(error);
  }
};

export const shippingInfo = async (req, res, next) => {
  try {
    const addresses = req.body?.addresses;
    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw badRequest("addresses is required");
    }

    return res.status(200).json(buildShippingInfoResponse(addresses));
  } catch (error) {
    return next(error);
  }
};

export const promotions = async (req, res) => {
  if (req.body?.code) {
    return res.status(400).json({
      error: {
        description: "Promotions are not configured",
      },
    });
  }

  return res.status(200).json({ promotions: [] });
};

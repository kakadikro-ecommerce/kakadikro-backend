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

const readAddresses = (req) => {
  const sources = [req.body, req.query];

  for (const source of sources) {
    if (!source) {
      continue;
    }

    const addresses = source.addresses;
    if (Array.isArray(addresses) && addresses.length > 0) {
      return addresses;
    }

    if (typeof addresses === "string" && addresses.trim()) {
      try {
        const parsed = JSON.parse(addresses);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // Razorpay may send the address list as a JSON string.
      }
    }

    if (source.zipcode || source.pincode) {
      return [
        {
          id: source.id || "0",
          zipcode: source.zipcode || source.pincode,
          state_code: source.state_code,
          country: source.country || "IN",
        },
      ];
    }
  }

  return [];
};

export const shippingInfo = async (req, res) => {
  const addresses = readAddresses(req);
  if (addresses.length === 0) {
    return res.status(200).json({ addresses: [] });
  }

  return res.status(200).json(buildShippingInfoResponse(addresses));
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

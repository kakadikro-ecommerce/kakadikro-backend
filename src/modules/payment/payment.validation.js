import Joi from "joi";

export const createPaymentOrderValidation = Joi.object({
  orderId: Joi.string().trim().required().messages({
    "string.empty": "Order id is required",
  }),
});

export const verifyPaymentValidation = Joi.object({
  razorpayOrderId: Joi.string().trim().required(),
  razorpayPaymentId: Joi.string().trim().required(),
  razorpaySignature: Joi.string().trim().required(),
  shippingAddress: Joi.object({
    fullName: Joi.string().trim().min(2).max(80).required(),
    phone: Joi.string().trim().allow("").max(20).optional(),
    addressLine1: Joi.string().trim().min(5).max(200).required(),
    addressLine2: Joi.string().trim().allow("").max(200).optional(),
    city: Joi.string().trim().min(2).max(80).required(),
    state: Joi.string().trim().min(2).max(80).required(),
    postalCode: Joi.string().trim().min(4).max(10).required(),
    country: Joi.string().trim().max(56).default("India"),
  }).optional(),
});

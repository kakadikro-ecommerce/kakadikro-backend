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
});

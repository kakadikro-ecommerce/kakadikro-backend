import Joi from "joi";

export const magicCheckoutValidation = Joi.object({
  customer: Joi.object({
    name: Joi.string().trim().min(2).max(80).optional(),
    email: Joi.string().trim().email().optional(),
  }).optional(),
});

export const shippingInfoValidation = Joi.object({
  order_id: Joi.string().trim().allow("").optional(),
  razorpay_order_id: Joi.string().trim().allow("").optional(),
  email: Joi.string().trim().allow("").optional(),
  contact: Joi.string().trim().allow("").optional(),
  addresses: Joi.array()
    .items(
      Joi.object({
        id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
        zipcode: Joi.string().trim().required(),
        state_code: Joi.string().trim().allow("").optional(),
        country: Joi.string().trim().max(56).required(),
      })
    )
    .min(1)
    .required(),
}).unknown(true);

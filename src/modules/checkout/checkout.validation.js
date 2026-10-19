import Joi from "joi";

export const magicCheckoutValidation = Joi.object({
  customer: Joi.object({
    name: Joi.string().trim().min(2).max(80).optional(),
    email: Joi.string().trim().email().optional(),
  }).optional(),
});

const zipcodeSchema = Joi.alternatives().try(
  Joi.string().trim(),
  Joi.number()
);

export const shippingInfoValidation = Joi.object({
  order_id: Joi.string().trim().allow("").optional(),
  razorpay_order_id: Joi.string().trim().allow("").optional(),
  email: Joi.string().trim().allow("").optional(),
  contact: Joi.alternatives().try(Joi.string().trim().allow(""), Joi.number()).optional(),
  addresses: Joi.array()
    .items(
      Joi.object({
        id: Joi.alternatives().try(Joi.string().allow(""), Joi.number()).optional(),
        zipcode: zipcodeSchema.required(),
        state_code: Joi.string().trim().allow("").optional(),
        state: Joi.string().trim().allow("").optional(),
        country: Joi.string().trim().max(56).allow("").optional(),
        country_code: Joi.string().trim().max(8).allow("").optional(),
      }).unknown(true)
    )
    .min(1)
    .required(),
}).unknown(true);

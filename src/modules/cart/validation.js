import Joi from "joi";

export const addCartItemValidation = Joi.object({
  productId: Joi.string().trim().required().messages({
    "string.empty": "Product id is required",
  }),
  weight: Joi.string().trim().required().messages({
    "string.empty": "Product weight is required",
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "Quantity must be a number",
    "number.min": "Quantity must be at least 1",
  }),
});

export const updateCartItemValidation = Joi.object({
  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "Quantity must be a number",
    "number.min": "Quantity must be at least 1",
  }),
});

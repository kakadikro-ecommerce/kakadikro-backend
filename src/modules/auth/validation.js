import Joi from "joi";

export const registerValidation = Joi.object({
  name: Joi.string().trim().min(3).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 3 characters",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.email": "Valid email is required",
    "string.empty": "Valid email is required",
  }),
  password: Joi.string().trim().min(6).required().messages({
    "string.min": "Password must be at least 6 characters",
    "string.empty": "Password is required",
  }),
});

export const loginValidation = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.email": "Valid email is required",
    "string.empty": "Valid email is required",
  }),
  password: Joi.string().trim().required().messages({
    "string.empty": "Password is required",
  }),
});

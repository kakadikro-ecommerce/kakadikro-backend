import Joi from "joi";
import { nonNumericString } from "../../shared/validation/string.js";
import { passwordSchema } from "../user/user.validation.js";


export const loginValidation = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.email": "Valid email is required",
    "string.empty": "Valid email is required",
  }),
  password: Joi.string().trim().required().messages({
    "string.empty": "Password is required",
  }),
});

export const createAdminValidation = Joi.object({
  name: nonNumericString("Name").min(3).required().messages({
    "string.min": "Name must be at least 3 characters",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.email": "Invalid email address",
    "string.empty": "Email is required",
  }),
  password: passwordSchema,
});

export const updateUserStatusValidation = Joi.object({
  isActive: Joi.boolean().required().messages({
    "any.required": "Status is required",
    "boolean.base": "Status must be true or false",
  }),
});

export const updateProfileValidation = Joi.object({
  name: nonNumericString("Name").min(3).optional().messages({
    "string.min": "Name must be at least 3 characters",
  }),
});

export const changePasswordValidation = Joi.object({
  currentPassword: Joi.string().trim().required().messages({
    "string.empty": "Current password required",
  }),
  newPassword: passwordSchema,
});
import Joi from "joi";
import { nonNumericString } from "../../shared/validation/string.js";

export const passwordSchema = Joi.string()
  .trim()
  .min(10)
  .max(15)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
  .messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 10 characters",
    "string.pattern.base":
      "Password must include uppercase, lowercase, number, and special character",
  });

export const registerValidation = Joi.object({
  name: nonNumericString("Name").min(3).required().messages({
    "string.min": "Name must be at least 3 characters",
  }),
  email: Joi.string().trim().email().required().messages({
    "string.email": "Valid email is required",
    "string.empty": "Valid email is required",
  }),
  password: passwordSchema,
});

export const loginValidation = Joi.object({
  email: Joi.string().trim().email().required().messages({
    "string.email": "Valid email is required",
    "string.empty": "Valid email is required",
  }),
 password: Joi.string().required().messages({
  "string.empty": "Password is required",
})
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

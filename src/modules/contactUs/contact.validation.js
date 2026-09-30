import Joi from "joi";
import { nonNumericString } from "../../shared/validation/string.js";

const withoutControlChars = (value, helpers) => {
  if (/[\u0000-\u001F\u007F]/.test(value)) {
    return helpers.error("string.pattern.base");
  }

  return value;
};

const messageText = (value, helpers) => {
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) {
    return helpers.error("string.pattern.base");
  }

  return value;
};

export const createContactSchema = Joi.object({
  name: nonNumericString("Name")
    .min(2)
    .max(100)
    .custom(withoutControlChars)
    .required()
    .messages({
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name must be 100 characters or fewer",
      "string.pattern.base": "Name contains invalid characters",
    }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .max(254)
    .custom(withoutControlChars)
    .required()
    .messages({
      "string.email": "Valid email is required",
      "string.empty": "Valid email is required",
      "string.max": "Email must be 254 characters or fewer",
      "string.pattern.base": "Valid email is required",
    }),
  phone: Joi.string()
    .trim()
    .pattern(/^[0-9+\-\s()]{8,20}$/)
    .optional()
    .allow("", null)
    .messages({
      "string.pattern.base": "Phone must be a valid phone number",
    }),
  subject: nonNumericString("Subject")
    .min(2)
    .max(150)
    .custom(withoutControlChars)
    .optional()
    .allow("", null)
    .messages({
      "string.min": "Subject must be at least 2 characters",
      "string.max": "Subject must be 150 characters or fewer",
      "string.pattern.base": "Subject contains invalid characters",
    }),
  message: Joi.string()
    .trim()
    .min(5)
    .max(1000)
    .custom(messageText)
    .required()
    .messages({
      "string.empty": "Message is required",
      "string.min": "Message must be at least 5 characters",
      "string.max": "Message must be 1000 characters or fewer",
      "string.pattern.base": "Message contains invalid characters",
    }),
});

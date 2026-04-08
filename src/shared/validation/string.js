import Joi from "joi";

export const nonNumericString = (label) =>
  Joi.string()
    .trim()
    .custom((value, helpers) => {
      if (/^\d+$/.test(value)) {
        return helpers.error("string.notNumeric", { label });
      }

      return value;
    })
    .messages({
      "string.empty": `${label} is required`,
      "string.notNumeric": `${label} must be a valid text value`,
    });

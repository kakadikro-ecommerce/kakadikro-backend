import Joi from "joi";

export const updateProfileValidation = Joi.object({
    name: Joi.string().trim().min(3).optional().messages({
        "string.min": "Name must be at least 3 characters",
    }),
});

export const changePasswordValidation = Joi.object({
    currentPassword: Joi.string().trim().required().messages({
        "string.empty": "Current password required",
    }),
    newPassword: Joi.string().trim().min(6).required().messages({
        "string.min": "Password must be at least 6 characters",
        "string.empty": "Password must be at least 6 characters",
    }),
});

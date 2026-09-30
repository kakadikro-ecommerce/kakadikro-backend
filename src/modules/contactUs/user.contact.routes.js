import express from "express";
import rateLimit from "express-rate-limit";
import * as contactController from "./contact.controller.js";
import { createContactSchema } from "./contact.validation.js";
import validateRequest from "../../middlewares/validate-request.js";

const router = express.Router();

const contactSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many messages. Please wait a little and try again.",
      details: null,
    });
  },
});

router.post(
  "/",
  contactSubmissionLimiter,
  validateRequest(createContactSchema),
  contactController.createContact
);

export default router;

import express from "express";
import * as contactController from "./contact.controller.js";
import { createContactSchema } from "./contact.validation.js";
import validateRequest from "../../middlewares/validate-request.js";

const router = express.Router();

router.post("/", validateRequest(createContactSchema), contactController.createContact);

export default router;

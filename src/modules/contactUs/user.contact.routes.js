import express from "express";
import * as contactController from "./controller.js";
import { createContactSchema } from "./validation.js";
import validateRequest from "../../middlewares/validate-request.js";

const router = express.Router();

router.post("/", validateRequest(createContactSchema), contactController.createContact);

export default router;

import express from "express";
import * as contactController from "./contact.controller.js";
import { createContactSchema } from "./contact.validation.js";
import validateRequest from "../../middlewares/validate-request.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("user"), validateRequest(createContactSchema), contactController.createContact);

export default router;

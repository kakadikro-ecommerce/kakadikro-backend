import express from "express";
import * as contactController from "./controller.js";
import { protect } from "../../middlewares/auth.js";
import { createContactSchema } from "./validation.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import validateRequest from "../../middlewares/validate-request.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("user"), validateRequest(createContactSchema), contactController.createContact);

router.get("/", protect, authorizeRoles("admin"), contactController.getAllContacts);
router.get("/:id", protect, authorizeRoles("admin"), contactController.getContactById);
router.delete("/:id", protect, authorizeRoles("admin"), contactController.deleteContact);

export default router;
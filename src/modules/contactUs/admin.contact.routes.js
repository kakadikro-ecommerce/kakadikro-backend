import express from "express";
import * as contactController from "./contact.controller.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.get("/", protect, authorizeRoles("admin", "super_admin"), contactController.getAllContacts);
router.get("/:id", protect, authorizeRoles("admin", "super_admin"), contactController.getContactById);
router.delete("/:id", protect, authorizeRoles("admin", "super_admin"), contactController.deleteContact);

export default router;

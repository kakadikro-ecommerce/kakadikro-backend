import express from "express";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import * as adminController from "./admin.controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import {
  createAdminValidation,
  updateUserStatusValidation,
} from "./admin.validation.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("admin", "super_admin"), validateRequest(createAdminValidation), adminController.createAdminUser);

router.get("/", protect, authorizeRoles("admin", "super_admin"), adminController.getAllUsers);

router.get("/profile", protect, authorizeRoles("admin", "super_admin"), adminController.getProfile);

router.get("/:id", protect, authorizeRoles("admin", "super_admin"), adminController.getUserById);

router.put("/status/:id", protect, authorizeRoles("admin", "super_admin"), validateRequest(updateUserStatusValidation), adminController.updateUserStatus);

export default router;

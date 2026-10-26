import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import express from "express";
import * as adminController from "./admin.controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import {
  updateProfileValidation,
  changePasswordValidation,
} from "./admin.validation.js";

const router = express.Router();

// Mounted at /api/admin/profile — keep paths aligned with the admin panel client.
router.get(
  "/",
  protect,
  authorizeRoles("admin", "super_admin"),
  adminController.getProfile
);

router.put(
  "/",
  protect,
  authorizeRoles("admin", "super_admin"),
  validateRequest(updateProfileValidation),
  adminController.updateProfile
);

router.put(
  "/password",
  protect,
  authorizeRoles("admin", "super_admin"),
  validateRequest(changePasswordValidation),
  adminController.changePassword
);

export default router;

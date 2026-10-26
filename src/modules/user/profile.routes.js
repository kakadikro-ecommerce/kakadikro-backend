import express from "express";
import * as userController from "./user.controller.js";
import {
  updateProfileValidation,
  changePasswordValidation,
} from "./user.validation.js";
import validateRequest from "../../middlewares/validate-request.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

// Mounted at /api/user/profile — keep paths aligned with the website client.
router.get("/", protect, authorizeRoles("user"), userController.getProfile);

router.put(
  "/",
  protect,
  authorizeRoles("user"),
  validateRequest(updateProfileValidation),
  userController.updateProfile
);

router.put(
  "/password/:id",
  protect,
  authorizeRoles("user"),
  validateRequest(changePasswordValidation),
  userController.changePassword
);

// Backward-compatible aliases (password without :id).
router.put(
  "/password",
  protect,
  authorizeRoles("user"),
  validateRequest(changePasswordValidation),
  userController.changePassword
);

export default router;

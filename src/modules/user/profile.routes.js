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

router.get("/profile", protect, authorizeRoles("user"), userController.getProfile);

router.put("/profile", protect, authorizeRoles("user"), validateRequest(updateProfileValidation), userController.updateProfile);

router.put("/profile/password", protect, authorizeRoles("user"), validateRequest(changePasswordValidation), userController.changePassword);

export default router;
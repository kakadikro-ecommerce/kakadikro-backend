import express from "express";
import * as userController from "./controller.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import {
  updateProfileValidation,
  changePasswordValidation,
} from "./validation.js";
import validateRequest from "../../middlewares/validate-request.js";

const router = express.Router();

router.get("/profile", protect, userController.getProfile);

router.put("/profile", protect, validateRequest(updateProfileValidation), userController.updateProfile);

router.put("/change-password/:id", protect, validateRequest(changePasswordValidation), userController.changePassword);

router.get("/", protect, authorizeRoles("admin"), userController.getAllUsers);

router.get("/:id", protect, authorizeRoles("admin"), userController.getUser);

router.put("/:id", protect, authorizeRoles("admin"), userController.updateUser);

router.delete("/:id", protect, authorizeRoles("admin"), userController.deleteUser);

export default router;

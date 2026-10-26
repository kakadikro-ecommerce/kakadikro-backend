import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import express from "express";
import * as adminController from "./admin.controller.js";
import { validateRequest } from "../../middlewares/validate-request.js";
import { updateProfileValidation, changePasswordValidation } from "./admin.validation.js";

const router = express.Router();

router.get("/self-profile", protect, authorizeRoles("admin", "super_admin"), adminController.getProfile);

router.put("/update-profile", protect, authorizeRoles("admin", "super_admin"), validateRequest(updateProfileValidation), adminController.updateProfile);

router.put("/update-password", protect, authorizeRoles("admin", "super_admin"), validateRequest(changePasswordValidation), adminController.changePassword); 

export default router;
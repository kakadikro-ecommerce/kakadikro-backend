import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import validateRequest from "../../middlewares/validate-request.js";
import { loginAdmin, logoutAdmin } from "./auth.controller.js";
import { loginValidation } from "./admin.validation.js";
import express from "express";

const router = express.Router();

router.post("/login", validateRequest(loginValidation), loginAdmin);
router.post("/logout", protect, authorizeRoles("admin", "super_admin"), logoutAdmin);

export default router;
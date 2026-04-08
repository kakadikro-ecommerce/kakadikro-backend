import express from "express";
import validateRequest from "../../middlewares/validate-request.js";
import { loginValidation, registerValidation } from "./user.validation.js";
import { registerUser, loginUser, logoutUser } from "./auth.controller.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.post("/register", validateRequest(registerValidation), registerUser);

router.post("/login", validateRequest(loginValidation), loginUser);

router.post("/logout", protect, authorizeRoles("user"), logoutUser);

export default router;
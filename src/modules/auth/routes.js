import express from "express";
import { registerUser, loginUser, logoutUser } from "./controller.js";
import { registerValidation, loginValidation } from "./validation.js";
import validateRequest from "../../middlewares/validate-request.js";

const router = express.Router();

router.post("/register", validateRequest(registerValidation), registerUser);

router.post("/login", validateRequest(loginValidation), loginUser);
router.post("/logout", logoutUser);

export default router;

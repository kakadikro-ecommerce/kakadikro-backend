import express from "express";
import * as userController from "./controller.js";
import validateRequest from "../../middlewares/validate-request.js";
import { changePasswordValidation } from "../user/validation.js";

const router = express.Router();

router.get("/profile", userController.getProfile);
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUser);
router.put("/:id", userController.updateUser);
router.put("/profile/password/:id", validateRequest(changePasswordValidation), userController.changePassword);
router.delete("/:id", userController.deleteUser);

export default router;

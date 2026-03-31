import express from "express";
import * as userController from "./controller.js";
import {
  updateProfileValidation,
  changePasswordValidation,
} from "./validation.js";
import validateRequest from "../../middlewares/validate-request.js";

const router = express.Router();

router.get("/profile", userController.getProfile);

router.put(
  "/profile",
  validateRequest(updateProfileValidation),
  userController.updateProfile
);

router.put(
  "/profile/password/:id",
  validateRequest(changePasswordValidation),
  userController.changePassword
);

export default router;

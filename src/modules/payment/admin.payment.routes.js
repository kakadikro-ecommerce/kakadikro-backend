import express from "express";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import asyncHandler from "../../shared/http/async-handler.js";
import * as paymentController from "./payment.controller.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin", "super_admin"),
  asyncHandler(paymentController.getAllPaymentsAdmin)
);

export default router;

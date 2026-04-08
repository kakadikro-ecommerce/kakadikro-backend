import express from "express";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";
import validateRequest from "../../middlewares/validate-request.js";
import {
  createProductReview,
  getReviewsByProduct,
  checkReviewEligibility,
  updateProductReview,
  deleteProductReview,
} from "./review.controller.js";
import {
  createReviewValidation,
  updateReviewValidation,
} from "./review.validation.js";

const router = express.Router();

router.post("/", protect, authorizeRoles("user"), validateRequest(createReviewValidation), createProductReview);

router.get("/:productId", getReviewsByProduct);

router.get("/can-review/:productId", protect, authorizeRoles("user"), checkReviewEligibility);

router.put("/:id", protect, authorizeRoles("user"), validateRequest(updateReviewValidation), updateProductReview);

router.delete("/:id", protect, authorizeRoles("user"), deleteProductReview);

export default router;

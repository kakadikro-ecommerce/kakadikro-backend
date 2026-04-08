import express from "express";
import * as productController from "./product.controller.js";
import reviewRoutes from "../../modules/review/review.routes.js";

const router = express.Router();

router.get("/", productController.getAllProducts);

router.get("/:slug", productController.getProductBySlug);

router.use("/reviews", reviewRoutes);

export default router;

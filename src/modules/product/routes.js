import express from "express";
import * as productController from "./controller.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  productController.getAllProductsAdmin
);

router.get(
  "/:id",
  protect,
  authorizeRoles("admin"),
  productController.getProductById
); 

router.post(
  "/",
  protect,
  authorizeRoles("admin"),
  productController.createProduct
);

router.put(
  "/:id",
  protect,
  authorizeRoles("admin"),
  productController.updateProduct
);

router.delete(
  "/:id",
  protect,
  authorizeRoles("admin"),
  productController.deleteProduct
);

// Public routes
router.get("/", productController.getAllProducts);
router.get("/:slug", productController.getProductBySlug);

export default router;

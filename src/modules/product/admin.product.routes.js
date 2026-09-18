import express from "express";
import * as productController from "./product.controller.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.get("/product-types", protect, authorizeRoles("admin", "super_admin"), productController.getProductTypes);

router.get("/", protect, authorizeRoles("admin", "super_admin"), productController.getAllProductsAdmin);

router.get("/:id", protect, authorizeRoles("admin", "super_admin"), productController.getProductById);

router.post("/", protect, authorizeRoles("admin", "super_admin"), productController.createProduct);

router.put("/:id", protect, authorizeRoles("admin", "super_admin"), productController.updateProduct);

router.put("/status/:id", protect, authorizeRoles("admin", "super_admin"), productController.updateProductStatus);

export default router;

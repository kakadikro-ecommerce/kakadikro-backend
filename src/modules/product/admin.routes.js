import express from "express";
import * as productController from "./controller.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.use(protect, authorizeRoles("admin"));

router.get("/", productController.getAllProductsAdmin);
router.get("/:id", productController.getProductById);
router.post("/", productController.createProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

export default router;
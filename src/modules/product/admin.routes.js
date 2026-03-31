import express from "express";
import * as productController from "./controller.js";

const router = express.Router();

router.get("/", productController.getAllProductsAdmin);
router.get("/:id", productController.getProductById);
router.post("/", productController.createProduct);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

export default router;

import express from "express";
import userRoutes from "../modules/user/routes.js";
import authRoutes from "../modules/auth/routes.js";
import productRoutes from "../modules/product/routes.js";
import orderRoutes from "../modules/order/routes.js";
import cartRoutes from "../modules/cart/routes.js";
import paymentRoutes from "../modules/payment/routes.js";

const router = express.Router();

router.use("/users", userRoutes);
router.use("/auth", authRoutes);
router.use("/products", productRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);

export default router;

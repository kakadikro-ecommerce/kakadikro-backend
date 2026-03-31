import express from "express";
import authRoutes from "../modules/auth/routes.js";
import productRoutes from "../modules/product/public.routes.js";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";

const router = express.Router();

router.use("/v1/auth", authRoutes);
router.use("/v1/products", productRoutes);
router.use("/v1/user", userRoutes);
router.use("/v1/admin", adminRoutes);

export default router;

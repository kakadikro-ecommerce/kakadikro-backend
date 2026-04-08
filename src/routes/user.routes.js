import express from "express";
import userProfileRoutes from "../modules/user/profile.routes.js";
import userCartRoutes from "../modules/cart/user.cart.routes.js";
import userOrderRoutes from "../modules/order/user.order.routes.js";
import paymentRoutes from "../modules/payment/payment.routes.js";
import userContactRoutes from "../modules/contactUs/user.contact.routes.js";
import userAuthRoutes from "../modules/user/auth.routes.js";
import userProductsRoutes from "../modules/product/user.product.routes.js";

const router = express.Router();

router.use("/auth", userAuthRoutes);
router.use("/", userProfileRoutes);
router.use("/products", userProductsRoutes);
router.use("/cart", userCartRoutes);
router.use("/orders", userOrderRoutes);
router.use("/payments", paymentRoutes);
router.use("/contacts", userContactRoutes);

export default router;

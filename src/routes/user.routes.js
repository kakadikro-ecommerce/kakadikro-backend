import express from "express";
import { protect } from "../middlewares/auth.js";
import { authorizeRoles } from "../middlewares/role-access.js";
import userProfileRoutes from "../modules/user/user.routes.js";
import cartRoutes from "../modules/cart/routes.js";
import userOrderRoutes from "../modules/order/user.order.routes.js";
import paymentRoutes from "../modules/payment/routes.js";
import userContactRoutes from "../modules/contactUs/user.contact.routes.js";

const router = express.Router();

router.use(protect, authorizeRoles("user"));

router.use("/", userProfileRoutes);
router.use("/cart", cartRoutes);
router.use("/orders", userOrderRoutes);
router.use("/payments", paymentRoutes);
router.use("/contacts", userContactRoutes);

export default router;

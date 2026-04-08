import express from "express";
import adminProfileRoutes from "../modules/admin/profile.routes.js";
import adminOrderRoutes from "../modules/order/admin.order.routes.js";
import adminContactRoutes from "../modules/contactUs/admin.contact.routes.js";
import adminProductRoutes from "../modules/product/admin.product.routes.js";
import adminAuthRoutes from "../modules/admin/auth.routes.js"
import adminUserRoutes from "../modules/admin/users.routes.js";

const router = express.Router();

router.use("/auth", adminAuthRoutes);
router.use("/", adminProfileRoutes);
router.use("/products", adminProductRoutes);
router.use("/orders", adminOrderRoutes);
router.use("/contacts", adminContactRoutes);
router.use("/users", adminUserRoutes);

export default router;

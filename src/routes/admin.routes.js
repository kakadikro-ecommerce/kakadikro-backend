import express from "express";
import { protect } from "../middlewares/auth.js";
import { authorizeRoles } from "../middlewares/role-access.js";
import adminProductRoutes from "../modules/product/admin.routes.js";
import adminUserRoutes from "../modules/user/admin.user.routes.js";
import adminOrderRoutes from "../modules/order/admin.order.routes.js";
import adminContactRoutes from "../modules/contactUs/admin.contact.routes.js";

const router = express.Router();

router.use(protect, authorizeRoles("admin"));

router.use("/products", adminProductRoutes);
router.use("/users", adminUserRoutes);
router.use("/orders", adminOrderRoutes);
router.use("/contacts", adminContactRoutes);

export default router;

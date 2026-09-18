import express from "express";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";

const router = express.Router();

router.use("/user", userRoutes);
router.use("/admin", adminRoutes);

export default router;

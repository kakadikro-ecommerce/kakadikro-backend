import express from "express";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";

const router = express.Router();

router.use("/v1/user", userRoutes);
router.use("/v1/admin", adminRoutes);

export default router;

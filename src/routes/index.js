import express from "express";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";
import paymentWebhookRoutes from "../modules/payment/payment.webhook.routes.js";

const router = express.Router();

router.use("/user", userRoutes);
router.use("/admin", adminRoutes);
router.use("/payments/webhooks", paymentWebhookRoutes);

export default router;

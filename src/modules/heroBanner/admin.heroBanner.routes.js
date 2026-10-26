import express from "express";
import * as heroBannerController from "./heroBanner.controller.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.use(protect, authorizeRoles("admin", "super_admin"));

router.get("/", heroBannerController.getAdminHeroBanners);
router.get("/:id", heroBannerController.getHeroBannerById);
router.post("/", heroBannerController.createHeroBanner);
router.put("/:id", heroBannerController.updateHeroBanner);
router.delete("/:id", heroBannerController.deleteHeroBanner);

export default router;

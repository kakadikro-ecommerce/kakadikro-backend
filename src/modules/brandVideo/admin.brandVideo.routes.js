import express from "express";
import * as brandVideoController from "./brandVideo.controller.js";
import { protect } from "../../middlewares/auth.js";
import { authorizeRoles } from "../../middlewares/role-access.js";

const router = express.Router();

router.use(protect, authorizeRoles("admin", "super_admin"));

router.get("/", brandVideoController.getAdminBrandVideos);
router.get("/:id", brandVideoController.getBrandVideoById);
router.post("/", brandVideoController.createBrandVideo);
router.put("/:id", brandVideoController.updateBrandVideo);
router.delete("/:id", brandVideoController.deleteBrandVideo);

export default router;

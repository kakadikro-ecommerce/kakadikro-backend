import express from "express";
import * as heroBannerController from "./heroBanner.controller.js";

const router = express.Router();

router.get("/", heroBannerController.getPublicHeroBanners);

export default router;

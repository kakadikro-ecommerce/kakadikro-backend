import express from "express";
import * as brandVideoController from "./brandVideo.controller.js";

const router = express.Router();

router.get("/", brandVideoController.getPublicBrandVideos);

export default router;

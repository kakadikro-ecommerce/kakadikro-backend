import express from "express";
import * as contactController from "./controller.js";

const router = express.Router();

router.get("/", contactController.getAllContacts);
router.get("/:id", contactController.getContactById);
router.delete("/:id", contactController.deleteContact);

export default router;

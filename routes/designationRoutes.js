import express from "express";
import { createDesignation, getDesignations, deleteDesignation } from "../controllers/designationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createDesignation);
router.get("/", protect, getDesignations);
router.delete("/:id", protect, deleteDesignation);

export default router;

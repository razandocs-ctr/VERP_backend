import express from "express";
import { createDepartment, getDepartments, deleteDepartment } from "../controllers/departmentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createDepartment);
router.get("/", protect, getDepartments);
router.delete("/:id", protect, deleteDepartment);

export default router;

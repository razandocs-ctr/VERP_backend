import express from "express";
import { getEmployees } from "../controllers/employee/getEmployees.js";
import { getEmployeeById } from "../controllers/employee/getEmployeeById.js";
import { addEmployee } from "../controllers/employee/addEmployee.js";
// import { updateEmployee } from "../controllers/employee/updateEmployee.js";
import { updateBasicDetails } from "../controllers/employee/updateBasicDetails.js";
import { deleteEmployee } from "../controllers/employee/deleteEmployee.js";
const router = express.Router();

router.get("/", getEmployees);
router.post("/", addEmployee);
// Specific routes MUST come before generic :id routes
router.patch("/basic-details/:id", updateBasicDetails);
router.get("/:id", getEmployeeById);
// router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;


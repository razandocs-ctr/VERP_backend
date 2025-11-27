import express from "express";
import { getEmployees } from "../controllers/employee/getEmployees.js";
import { getEmployeeById } from "../controllers/employee/getEmployeeById.js";
import { addEmployee } from "../controllers/employee/addEmployee.js";
// import { updateEmployee } from "../controllers/employee/updateEmployee.js";
import { updateBasicDetails } from "../controllers/employee/updateBasicDetails.js";
import { addEmergencyContact } from "../controllers/employee/addEmergencyContact.js";
import { updateEmergencyContact } from "../controllers/employee/updateEmergencyContact.js";
import { deleteEmergencyContact } from "../controllers/employee/deleteEmergencyContact.js";
import { sendApprovalEmail } from "../controllers/employee/sendApprovalEmail.js";
import { approveProfile } from "../controllers/employee/approveProfile.js";
import { deleteEmployee } from "../controllers/employee/deleteEmployee.js";
import { updateVisaDetails } from "../controllers/employee/updateVisaDetails.js";
import { updatePassportDetails } from "../controllers/employee/updatePassportDetails.js";
const router = express.Router();

router.get("/", getEmployees);
router.post("/", addEmployee);
// Specific routes MUST come before generic :id routes
router.patch("/basic-details/:id", updateBasicDetails);
router.patch("/passport/:id", updatePassportDetails);
router.patch("/visa/:id", updateVisaDetails);
router.post("/:id/emergency-contact", addEmergencyContact);
router.patch("/:id/emergency-contact/:contactId", updateEmergencyContact);
router.delete("/:id/emergency-contact/:contactId", deleteEmergencyContact);
router.post("/:id/send-approval-email", sendApprovalEmail);
router.post("/:id/approve-profile", approveProfile);
router.get("/:id", getEmployeeById);
// router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;


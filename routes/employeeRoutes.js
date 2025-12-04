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
import { updateWorkDetails } from "../controllers/employee/updateWorkDetails.js";
import { addEducation } from "../controllers/employee/addEducation.js";
import { updateEducation } from "../controllers/employee/updateEducation.js";
import { deleteEducation } from "../controllers/employee/deleteEducation.js";
import { addExperience } from "../controllers/employee/addExperience.js";
import { updateExperience } from "../controllers/employee/updateExperience.js";
import { deleteExperience } from "../controllers/employee/deleteExperience.js";
import { uploadProfilePicture } from "../controllers/employee/uploadProfilePicture.js";
import { extractPdfText } from "../controllers/employee/extractPdfText.js";
const router = express.Router();

router.get("/", getEmployees);
router.post("/", addEmployee);
// Specific routes MUST come before generic :id routes
router.patch("/basic-details/:id", updateBasicDetails);
router.patch("/work-details/:id", updateWorkDetails);
router.patch("/passport/:id", updatePassportDetails);
router.patch("/visa/:id", updateVisaDetails);
// Upload profile picture route (specific route before generic :id routes)
router.post("/upload-profile-picture/:id", uploadProfilePicture);
// PDF extraction route (must be before :id routes)
router.post("/extract-pdf-text", (req, res, next) => {
    console.log('📄 PDF extraction route matched');
    extractPdfText(req, res, next);
});
// All :id specific routes must come before the generic :id route
router.post("/:id/emergency-contact", addEmergencyContact);
router.patch("/:id/emergency-contact/:contactId", updateEmergencyContact);
router.delete("/:id/emergency-contact/:contactId", deleteEmergencyContact);
router.post("/:id/education", addEducation);
router.patch("/:id/education/:educationId", updateEducation);
router.delete("/:id/education/:educationId", deleteEducation);
router.post("/:id/experience", addExperience);
router.patch("/:id/experience/:experienceId", updateExperience);
router.delete("/:id/experience/:experienceId", deleteExperience);
router.post("/:id/send-approval-email", sendApprovalEmail);
router.post("/:id/approve-profile", approveProfile);
// Generic :id routes must come last
router.get("/:id", getEmployeeById);
// router.put("/:id", updateEmployee);
router.delete("/:id", deleteEmployee);

export default router;


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
import { updateEmiratesIdDetails } from "../controllers/employee/updateEmiratesIdDetails.js";
import { updateLabourCardDetails } from "../controllers/employee/updateLabourCardDetails.js";
import { updateMedicalInsuranceDetails } from "../controllers/employee/updateMedicalInsuranceDetails.js";
import { updatePassportDetails } from "../controllers/employee/updatePassportDetails.js";
import { updateDrivingLicenseDetails } from "../controllers/employee/updateDrivingLicenseDetails.js";
import { updateWorkDetails } from "../controllers/employee/updateWorkDetails.js";
import { addEducation } from "../controllers/employee/addEducation.js";
import { updateEducation } from "../controllers/employee/updateEducation.js";
import { deleteEducation } from "../controllers/employee/deleteEducation.js";
import { addExperience } from "../controllers/employee/addExperience.js";
import { updateExperience } from "../controllers/employee/updateExperience.js";
import { deleteExperience } from "../controllers/employee/deleteExperience.js";
import { addTraining } from "../controllers/employee/addTraining.js";
import { updateTraining } from "../controllers/employee/updateTraining.js";
import { deleteTraining } from "../controllers/employee/deleteTraining.js";
import { uploadProfilePicture } from "../controllers/employee/uploadProfilePicture.js";
import { protect } from "../middleware/authMiddleware.js";
import { checkPermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

// All employee routes require authentication
router.use(protect);

// Employee list - requires view permission
router.get("/", checkPermission('hrm_employees_list', 'view'), getEmployees);

// Add employee - requires create permission
router.post("/", checkPermission('hrm_employees_add', 'create'), addEmployee);

// Specific routes MUST come before generic :id routes
// Update basic details - requires edit permission
router.patch("/basic-details/:id", checkPermission('hrm_employees_view_basic', 'edit'), updateBasicDetails);

// Update work details - requires edit permission
router.patch("/work-details/:id", checkPermission('hrm_employees_view_work', 'edit'), updateWorkDetails);

// Update passport - requires edit permission
router.patch("/passport/:id", checkPermission('hrm_employees_view_passport', 'edit'), updatePassportDetails);

// Update visa - requires edit permission
router.patch("/visa/:id", checkPermission('hrm_employees_view_visa', 'edit'), updateVisaDetails);

// Update Emirates ID - requires edit permission
router.patch("/emirates-id/:id", checkPermission('hrm_employees_view_passport', 'edit'), updateEmiratesIdDetails);

// Update Labour Card - requires edit permission
router.patch("/labour-card/:id", checkPermission('hrm_employees_view_passport', 'edit'), updateLabourCardDetails);

// Update Medical Insurance - requires edit permission
router.patch("/medical-insurance/:id", checkPermission('hrm_employees_view_passport', 'edit'), updateMedicalInsuranceDetails);

// Update Driving License - requires edit permission
router.patch("/driving-license/:id", checkPermission('hrm_employees_view_passport', 'edit'), updateDrivingLicenseDetails);

// Upload profile picture - requires edit permission
router.post("/upload-profile-picture/:id", checkPermission('hrm_employees_view_basic', 'edit'), uploadProfilePicture);

// All :id specific routes must come before the generic :id route
// Emergency contacts - requires edit permission
router.post("/:id/emergency-contact", checkPermission('hrm_employees_view_emergency', 'create'), addEmergencyContact);
router.patch("/:id/emergency-contact/:contactId", checkPermission('hrm_employees_view_emergency', 'edit'), updateEmergencyContact);
router.delete("/:id/emergency-contact/:contactId", checkPermission('hrm_employees_view_emergency', 'delete'), deleteEmergencyContact);

// Education - requires edit permission
router.post("/:id/education", checkPermission('hrm_employees_view_education', 'create'), addEducation);
router.patch("/:id/education/:educationId", checkPermission('hrm_employees_view_education', 'edit'), updateEducation);
router.delete("/:id/education/:educationId", checkPermission('hrm_employees_view_education', 'delete'), deleteEducation);

// Experience - requires edit permission
router.post("/:id/experience", checkPermission('hrm_employees_view_experience', 'create'), addExperience);
router.patch("/:id/experience/:experienceId", checkPermission('hrm_employees_view_experience', 'edit'), updateExperience);
router.delete("/:id/experience/:experienceId", checkPermission('hrm_employees_view_experience', 'delete'), deleteExperience);

// Training - requires edit permission
router.post("/:id/training", checkPermission('hrm_employees_view_training', 'create'), addTraining);
router.patch("/:id/training/:trainingId", checkPermission('hrm_employees_view_training', 'edit'), updateTraining);
router.delete("/:id/training/:trainingId", checkPermission('hrm_employees_view_training', 'delete'), deleteTraining);

// Send approval email - requires edit permission
router.post("/:id/send-approval-email", checkPermission('hrm_employees', 'edit'), sendApprovalEmail);

// Approve profile - requires edit permission
router.post("/:id/approve-profile", checkPermission('hrm_employees', 'edit'), approveProfile);

// Generic :id routes must come last
// Get employee by ID - requires view permission
router.get("/:id", checkPermission('hrm_employees_view', 'view'), getEmployeeById);

// Delete employee - requires delete permission
router.delete("/:id", checkPermission('hrm_employees', 'delete'), deleteEmployee);

export default router;


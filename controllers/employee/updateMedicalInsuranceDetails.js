import EmployeeMedicalInsurance from "../../models/EmployeeMedicalInsurance.js";
import { getCompleteEmployee, resolveEmployeeId } from "../../services/employeeService.js";
import { uploadDocumentToCloudinary, deleteDocumentFromCloudinary } from "../../utils/cloudinaryUpload.js";

const REQUIRED_FIELDS = ["provider", "number", "issueDate", "expiryDate", "upload"];

const buildMissingFields = (body, existingDocument) => {
    return REQUIRED_FIELDS.filter((field) => {
        if (field === "upload") {
            // Check if upload is provided OR if existing document exists in DB
            const hasUpload = body.upload && body.upload.trim() !== '';
            return !hasUpload && !existingDocument;
        }
        const value = body[field];
        return value === undefined || value === null || value === "";
    });
};

const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const updateMedicalInsuranceDetails = async (req, res) => {
    const { id } = req.params;
    const {
        provider,
        number,
        issueDate,
        expiryDate,
        upload,
        uploadName,
        uploadMime,
    } = req.body || {};

    try {
        // Get employeeId first to check for existing documents
        const employee = await resolveEmployeeId(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found." });
        }

        const employeeId = employee.employeeId;

        // Check if existing document exists in database (check for both url and data for backward compatibility)
        const existingMedicalInsurance = await EmployeeMedicalInsurance.findOne({ employeeId });
        const existingDocument = existingMedicalInsurance?.medicalInsurance?.document?.url || existingMedicalInsurance?.medicalInsurance?.document?.data;

        const missingFields = buildMissingFields({ provider, number, issueDate, expiryDate, upload }, existingDocument);
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: "Missing required Medical Insurance fields.",
                missingFields,
            });
        }

        const parsedIssueDate = normalizeDate(issueDate);
        const parsedExpiryDate = normalizeDate(expiryDate);
        if (!parsedIssueDate || !parsedExpiryDate) {
            return res.status(400).json({
                message: "Invalid issue or expiry date provided.",
            });
        }

        // Handle document upload to Cloudinary if new document provided
        let documentData = undefined;
        if (upload && upload.trim() !== '') {
            // Check if it's already a Cloudinary URL or base64
            if (upload.startsWith('http://') || upload.startsWith('https://')) {
                // Already a Cloudinary URL
                documentData = {
                    url: upload,
                    name: uploadName || "",
                    mimeType: uploadMime || "",
                };
            } else {
                // Upload base64 to Cloudinary
                const base64Data = upload.startsWith('data:') ? upload : `data:${uploadMime || 'application/pdf'};base64,${upload}`;
                const uploadResult = await uploadDocumentToCloudinary(
                    base64Data,
                    `employee-documents/${employeeId}/medical-insurance`,
                    uploadName || 'medical-insurance.pdf',
                    'raw'
                );
                
                // Delete old document from Cloudinary if exists
                if (existingMedicalInsurance?.medicalInsurance?.document?.publicId) {
                    await deleteDocumentFromCloudinary(existingMedicalInsurance.medicalInsurance.document.publicId, 'raw');
                }

                documentData = {
                    url: uploadResult.url,
                    publicId: uploadResult.publicId,
                    name: uploadName || "",
                    mimeType: uploadMime || "",
                };
            }
        } else {
            // Preserve existing document if no new one provided
            documentData = existingMedicalInsurance?.medicalInsurance?.document || undefined;
        }

        // Build payload - preserve existing document if no new one provided
        const medicalInsurancePayload = {
            provider: provider.trim(),
            number: number,
            issueDate: parsedIssueDate,
            expiryDate: parsedExpiryDate,
            document: documentData,
            lastUpdated: new Date(),
        };

        // Update or create Medical Insurance record
        const updatedMedicalInsurance = await EmployeeMedicalInsurance.findOneAndUpdate(
            { employeeId },
            {
                $set: {
                    medicalInsurance: medicalInsurancePayload,
                },
            },
            { upsert: true, new: true }
        );

        return res.json({
            message: "Medical Insurance details updated successfully.",
            medicalInsuranceDetails: updatedMedicalInsurance.medicalInsurance,
        });
    } catch (error) {
        console.error("Failed to update Medical Insurance details:", error);
        return res.status(500).json({
            message: "Failed to update Medical Insurance details.",
            error: error.message,
        });
    }
};













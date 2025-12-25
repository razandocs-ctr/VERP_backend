import EmployeeDrivingLicense from "../../models/EmployeeDrivingLicense.js";
import { getCompleteEmployee, resolveEmployeeId } from "../../services/employeeService.js";
import { uploadDocumentToCloudinary, deleteDocumentFromCloudinary } from "../../utils/cloudinaryUpload.js";

const REQUIRED_FIELDS = ["number", "issueDate", "expiryDate", "document"];

const buildMissingFields = (body, existingDocument) => {
    return REQUIRED_FIELDS.filter((field) => {
        if (field === "document") {
            // Check if document is provided OR if existing document exists in DB
            const hasDocument = body.document && body.document.trim() !== '';
            return !hasDocument && !existingDocument;
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

export const updateDrivingLicenseDetails = async (req, res) => {
    const { id } = req.params;
    const {
        number,
        issueDate,
        expiryDate,
        document,
        documentName,
        documentMime,
    } = req.body || {};

    try {
        // Get employeeId first to check for existing documents
        const employee = await resolveEmployeeId(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found." });
        }

        const employeeId = employee.employeeId;

        // Check if existing document exists in database (check for both url and data for backward compatibility)
        const existingDrivingLicense = await EmployeeDrivingLicense.findOne({ employeeId });
        const existingDocument = existingDrivingLicense?.drivingLicenceDetails?.document?.url || existingDrivingLicense?.drivingLicenceDetails?.document?.data;

        const missingFields = buildMissingFields({ number, issueDate, expiryDate, document }, existingDocument);
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: "Missing required Driving License fields.",
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
        if (document && document.trim() !== '') {
            // Check if it's already a Cloudinary URL or base64
            if (document.startsWith('http://') || document.startsWith('https://')) {
                // Already a Cloudinary URL
                documentData = {
                    url: document,
                    name: documentName || "",
                    mimeType: documentMime || "",
                };
            } else {
                // Upload base64 to Cloudinary
                const base64Data = document.startsWith('data:') ? document : `data:${documentMime || 'application/pdf'};base64,${document}`;
                const uploadResult = await uploadDocumentToCloudinary(
                    base64Data,
                    `employee-documents/${employeeId}/driving-license`,
                    documentName || 'driving-license.pdf',
                    'raw'
                );
                
                // Delete old document from Cloudinary if exists
                if (existingDrivingLicense?.drivingLicenceDetails?.document?.publicId) {
                    await deleteDocumentFromCloudinary(existingDrivingLicense.drivingLicenceDetails.document.publicId, 'raw');
                }

                documentData = {
                    url: uploadResult.url,
                    publicId: uploadResult.publicId,
                    name: documentName || "",
                    mimeType: documentMime || "",
                };
            }
        } else {
            // Preserve existing document if no new one provided
            documentData = existingDrivingLicense?.drivingLicenceDetails?.document || undefined;
        }

        // Build payload - preserve existing document if no new one provided
        const drivingLicensePayload = {
            number: number.trim(),
            issueDate: parsedIssueDate,
            expiryDate: parsedExpiryDate,
            document: documentData,
            lastUpdated: new Date(),
        };

        // Update or create Driving License record
        const updatedDrivingLicense = await EmployeeDrivingLicense.findOneAndUpdate(
            { employeeId },
            {
                $set: {
                    drivingLicenceDetails: drivingLicensePayload,
                },
            },
            { upsert: true, new: true }
        );

        console.log("✅ Driving License details saved for employee:", employeeId);
        console.log("   Driving License Number:", drivingLicensePayload.number);
        console.log("   Expiry Date:", drivingLicensePayload.expiryDate);

        return res.json({
            message: "Driving License details updated successfully.",
            drivingLicenceDetails: updatedDrivingLicense.drivingLicenceDetails,
        });
    } catch (error) {
        console.error("Failed to update Driving License details:", error);
        return res.status(500).json({
            message: "Failed to update Driving License details.",
            error: error.message,
        });
    }
};












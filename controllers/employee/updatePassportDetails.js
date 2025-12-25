import EmployeePassport from "../../models/EmployeePassport.js";
import { getCompleteEmployee, resolveEmployeeId } from "../../services/employeeService.js";
import { uploadDocumentToCloudinary, deleteDocumentFromCloudinary } from "../../utils/cloudinaryUpload.js";

const REQUIRED_FIELDS = ["number", "issueDate", "expiryDate"];

const normalizeDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const updatePassportDetails = async (req, res) => {
    const { id } = req.params;
    const {
        number,
        nationality,
        issueDate,
        expiryDate,
        placeOfIssue,
        passportCopy,
        passportCopyName,
        passportCopyMime,
    } = req.body || {};

    // Validate required fields
    const missingFields = REQUIRED_FIELDS.filter((field) => {
        const value = req.body[field];
        return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
        return res.status(400).json({
            message: "Missing required passport fields.",
            missingFields,
        });
    }

    // Validate dates
    const parsedIssueDate = normalizeDate(issueDate);
    const parsedExpiryDate = normalizeDate(expiryDate);

    if (!parsedIssueDate || !parsedExpiryDate) {
        return res.status(400).json({
            message: "Invalid issue or expiry date provided.",
        });
    }

    try {
        // Get employeeId from employee record using optimized resolver
        const employee = await resolveEmployeeId(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found." });
        }

        const employeeId = employee.employeeId;

        // Handle document upload to Cloudinary if new document provided
        let documentData = undefined;
        if (passportCopy) {
            // Check if it's already a Cloudinary URL or base64
            if (passportCopy.startsWith('http://') || passportCopy.startsWith('https://')) {
                // Already a Cloudinary URL
                documentData = {
                    url: passportCopy,
                    name: passportCopyName || "",
                    mimeType: passportCopyMime || "",
                };
            } else {
                // Upload base64 to Cloudinary
                const base64Data = passportCopy.startsWith('data:') ? passportCopy : `data:${passportCopyMime || 'application/pdf'};base64,${passportCopy}`;
                const uploadResult = await uploadDocumentToCloudinary(
                    base64Data,
                    `employee-documents/${employeeId}/passport`,
                    passportCopyName || 'passport.pdf',
                    'raw'
                );
                
                // Delete old document from Cloudinary if exists
                const existingPassport = await EmployeePassport.findOne({ employeeId });
                if (existingPassport?.document?.publicId) {
                    await deleteDocumentFromCloudinary(existingPassport.document.publicId, 'raw');
                }

                documentData = {
                    url: uploadResult.url,
                    publicId: uploadResult.publicId,
                    name: passportCopyName || "",
                    mimeType: passportCopyMime || "",
                };
            }
        } else {
            // Preserve existing document if no new one provided
            const existingPassport = await EmployeePassport.findOne({ employeeId });
            if (existingPassport?.document) {
                documentData = existingPassport.document;
            }
        }

        // Build passport payload
        const passportPayload = {
            number: number?.trim() || "",
            nationality: nationality?.trim() || "",
            issueDate: parsedIssueDate,
            expiryDate: parsedExpiryDate,
            placeOfIssue: placeOfIssue?.trim() || "",
            document: documentData,
            lastUpdated: new Date(),
            passportExp: parsedExpiryDate, // Update expiry date for quick reference
        };

        // Update or create passport record
        const updatedPassport = await EmployeePassport.findOneAndUpdate(
            { employeeId },
            passportPayload,
            { upsert: true, new: true }
        );

        console.log("✅ Passport details saved for employee:", employeeId);
        console.log("   Passport Number:", passportPayload.number);
        console.log("   Expiry Date:", passportPayload.expiryDate);

        return res.json({
            message: "Passport details updated successfully.",
            passportDetails: {
                number: updatedPassport.number,
                nationality: updatedPassport.nationality,
                issueDate: updatedPassport.issueDate,
                expiryDate: updatedPassport.expiryDate,
                placeOfIssue: updatedPassport.placeOfIssue,
                document: updatedPassport.document,
                lastUpdated: updatedPassport.lastUpdated,
            },
        });
    } catch (error) {
        console.error("Failed to update passport details:", error);
        return res.status(500).json({
            message: "Failed to update passport details.",
            error: error.message,
        });
    }
};


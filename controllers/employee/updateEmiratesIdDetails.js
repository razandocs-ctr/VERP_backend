import EmployeeEmiratesId from "../../models/EmployeeEmiratesId.js";
import { getCompleteEmployee } from "../../services/employeeService.js";

const REQUIRED_FIELDS = ["number", "issueDate", "expiryDate", "upload"];

const buildMissingFields = (body) => {
    return REQUIRED_FIELDS.filter((field) => {
        if (field === "upload") {
            return !body.upload;
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

export const updateEmiratesIdDetails = async (req, res) => {
    const { id } = req.params;
    const {
        number,
        issueDate,
        expiryDate,
        upload,
        uploadName,
        uploadMime,
    } = req.body || {};

    const missingFields = buildMissingFields({ number, issueDate, expiryDate, upload });
    if (missingFields.length > 0) {
        return res.status(400).json({
            message: "Missing required Emirates ID fields.",
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

    try {
        // Get employeeId from employee record
        const employee = await getCompleteEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found." });
        }

        const employeeId = employee.employeeId;

        const emiratesIdPayload = {
            number: number.trim(),
            issueDate: parsedIssueDate,
            expiryDate: parsedExpiryDate,
            document: upload
                ? {
                    data: upload,
                    name: uploadName || "",
                    mimeType: uploadMime || "",
                }
                : undefined,
            lastUpdated: new Date(),
        };

        // Update or create Emirates ID record
        const updatedEmiratesId = await EmployeeEmiratesId.findOneAndUpdate(
            { employeeId },
            {
                $set: {
                    emiratesId: emiratesIdPayload,
                },
            },
            { upsert: true, new: true }
        );

        return res.json({
            message: "Emirates ID details updated successfully.",
            emiratesIdDetails: updatedEmiratesId.emiratesId,
        });
    } catch (error) {
        console.error("Failed to update Emirates ID details:", error);
        return res.status(500).json({
            message: "Failed to update Emirates ID details.",
            error: error.message,
        });
    }
};














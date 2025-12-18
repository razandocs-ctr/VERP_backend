import EmployeeMedicalInsurance from "../../models/EmployeeMedicalInsurance.js";
import { getCompleteEmployee } from "../../services/employeeService.js";

const REQUIRED_FIELDS = ["provider", "number", "issueDate", "expiryDate", "upload"];

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

    const missingFields = buildMissingFields({ provider, number, issueDate, expiryDate, upload });
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

    try {
        // Get employeeId from employee record
        const employee = await getCompleteEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found." });
        }

        const employeeId = employee.employeeId;

        const medicalInsurancePayload = {
            provider: provider.trim(),
            number: number,
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













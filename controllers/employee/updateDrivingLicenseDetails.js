import EmployeeDrivingLicense from "../../models/EmployeeDrivingLicense.js";
import { getCompleteEmployee } from "../../services/employeeService.js";

const REQUIRED_FIELDS = ["number", "issueDate", "expiryDate", "document"];

const buildMissingFields = (body) => {
    return REQUIRED_FIELDS.filter((field) => {
        if (field === "document") {
            return !body.document;
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

    const missingFields = buildMissingFields({ number, issueDate, expiryDate, document });
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

    try {
        // Get employeeId from employee record
        const employee = await getCompleteEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found." });
        }

        const employeeId = employee.employeeId;

        const drivingLicensePayload = {
            number: number.trim(),
            issueDate: parsedIssueDate,
            expiryDate: parsedExpiryDate,
            document: document
                ? {
                      data: document,
                      name: documentName || "",
                      mimeType: documentMime || "",
                  }
                : undefined,
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












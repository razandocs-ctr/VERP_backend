import Employee from "../../models/Employee.js";

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
        // Build passport payload - only fields from frontend form
        const passportPayload = {
            number: number?.trim() || "",
            nationality: nationality?.trim() || "",
            issueDate: parsedIssueDate,
            expiryDate: parsedExpiryDate,
            placeOfIssue: placeOfIssue?.trim() || "",
            document: passportCopy
                ? {
                      data: passportCopy,
                      name: passportCopyName || "",
                      mimeType: passportCopyMime || "",
                  }
                : undefined,
            lastUpdated: new Date(),
        };

        // Update employee passport details and also update passportExp for backward compatibility
        const employee = await Employee.findByIdAndUpdate(
            id,
            {
                $set: {
                    passportDetails: passportPayload,
                    passportExp: parsedExpiryDate, // Update expiry date for backward compatibility
                },
            },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({ message: "Employee not found." });
        }

        console.log("✅ Passport details saved for employee:", employee.employeeId);
        console.log("   Passport Number:", passportPayload.number);
        console.log("   Expiry Date:", passportPayload.expiryDate);

        return res.json({
            message: "Passport details updated successfully.",
            passportDetails: employee.passportDetails,
        });
    } catch (error) {
        console.error("Failed to update passport details:", error);
        return res.status(500).json({
            message: "Failed to update passport details.",
            error: error.message,
        });
    }
};


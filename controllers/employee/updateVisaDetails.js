import Employee from "../../models/Employee.js";

const ALLOWED_VISA_TYPES = ["visit", "employment", "spouse"];

const REQUIRED_FIELDS_BY_TYPE = {
    visit: ["visaNumber", "issueDate", "expiryDate", "visaCopy"],
    employment: ["visaNumber", "issueDate", "expiryDate", "visaCopy", "sponsor"],
    spouse: ["visaNumber", "issueDate", "expiryDate", "visaCopy", "sponsor"],
};

const buildMissingFields = (body, visaType) => {
    const required = REQUIRED_FIELDS_BY_TYPE[visaType] || [];
    return required.filter((field) => {
        if (field === "visaCopy") {
            return !body.visaCopy;
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

export const updateVisaDetails = async (req, res) => {
    const { id } = req.params;
    const {
        visaType,
        visaNumber,
        issueDate,
        expiryDate,
        sponsor,
        visaCopy,
        visaCopyName,
        visaCopyMime,
    } = req.body || {};

    if (!visaType || !ALLOWED_VISA_TYPES.includes(visaType)) {
        return res.status(400).json({ message: "Invalid visa type provided." });
    }

    const missingFields = buildMissingFields(
        { visaNumber, issueDate, expiryDate, sponsor, visaCopy },
        visaType
    );
    if (missingFields.length > 0) {
        return res.status(400).json({
            message: "Missing required visa fields.",
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
        const visaPayload = {
            number: visaNumber,
            issueDate: parsedIssueDate,
            expiryDate: parsedExpiryDate,
            sponsor: sponsor || "",
            document: visaCopy
                ? {
                      data: visaCopy,
                      name: visaCopyName || "",
                      mimeType: visaCopyMime || "",
                  }
                : undefined,
            lastUpdated: new Date(),
        };

        const employee = await Employee.findByIdAndUpdate(
            id,
            {
                $set: {
                    [`visaDetails.${visaType}`]: visaPayload,
                },
            },
            { new: true }
        );

        if (!employee) {
            return res.status(404).json({ message: "Employee not found." });
        }

        return res.json({
            message: `${visaType} visa details updated successfully.`,
            visaDetails: employee.visaDetails,
        });
    } catch (error) {
        console.error("Failed to update visa details:", error);
        return res.status(500).json({
            message: "Failed to update visa details.",
            error: error.message,
        });
    }
};



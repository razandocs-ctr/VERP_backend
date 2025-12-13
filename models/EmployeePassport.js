import mongoose from "mongoose";

/**
 * EmployeePassport - Passport details and document expiry
 * Contains: Passport details, Document expiry dates
 */
const employeePassportSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            ref: "EmployeeBasic"
        },

        // PASSPORT DETAILS
        number: { type: String },
        nationality: { type: String },
        issueDate: { type: Date },
        expiryDate: { type: Date },
        placeOfIssue: { type: String },
        document: {
            data: { type: String },
            name: { type: String },
            mimeType: { type: String },
        },
        lastUpdated: { type: Date },

        // DOCUMENT EXPIRY DETAILS (for quick reference)
        passportExp: { type: Date },
        eidExp: { type: Date },
        medExp: { type: Date },
    },
    { timestamps: true }
);

// Index for faster queries
employeePassportSchema.index({ expiryDate: 1 });
employeePassportSchema.index({ passportExp: 1 });

// Ensure one passport record per employee
employeePassportSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.model("EmployeePassport", employeePassportSchema);


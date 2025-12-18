import mongoose from "mongoose";

/**
 * EmployeeDrivingLicense - Driving License details
 * Contains: Number, Issue Date, Emirates Issue Date, Issue Country, Expiry Date, Attachment
 */
const drivingLicenseDocumentSchema = new mongoose.Schema(
    {
        number: { type: String },
        issueDate: { type: Date },
        emiratesIssueDate: { type: String }, // Text field, not a date
        issueCountry: { type: String },
        expiryDate: { type: Date },
        document: {
            data: { type: String },
            name: { type: String },
            mimeType: { type: String },
        },
        lastUpdated: { type: Date },
    },
    { _id: false }
);

const employeeDrivingLicenseSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            ref: "EmployeeBasic"
        },

        // DRIVING LICENSE DETAILS
        drivingLicenceDetails: { type: drivingLicenseDocumentSchema, default: undefined },
    },
    { timestamps: true }
);

// Index for faster queries
employeeDrivingLicenseSchema.index({ "drivingLicenceDetails.expiryDate": 1 });

// Ensure one Driving License record per employee
employeeDrivingLicenseSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.model("EmployeeDrivingLicense", employeeDrivingLicenseSchema);












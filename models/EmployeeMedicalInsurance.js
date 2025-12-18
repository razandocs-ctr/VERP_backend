import mongoose from "mongoose";

/**
 * EmployeeMedicalInsurance - Medical Insurance details
 * Contains: Provider, Number, Issue Date, Expiry Date, Attachment
 */
const medicalInsuranceDocumentSchema = new mongoose.Schema(
    {
        provider: { type: String },
        number: { type: String },
        issueDate: { type: Date },
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

const employeeMedicalInsuranceSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            ref: "EmployeeBasic"
        },

        // MEDICAL INSURANCE DETAILS
        medicalInsurance: { type: medicalInsuranceDocumentSchema, default: undefined },
    },
    { timestamps: true }
);

// Index for faster queries
employeeMedicalInsuranceSchema.index({ "medicalInsurance.expiryDate": 1 });

// Ensure one Medical Insurance record per employee
employeeMedicalInsuranceSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.model("EmployeeMedicalInsurance", employeeMedicalInsuranceSchema);













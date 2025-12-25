import mongoose from "mongoose";

/**
 * EmployeeVisa - Visa details
 * Contains: Visit Visa, Employment Visa, Spouse Visa
 */
const visaDocumentSchema = new mongoose.Schema(
    {
        number: { type: String },
        issueDate: { type: Date },
        expiryDate: { type: Date },
        sponsor: { type: String },
        document: {
            url: { type: String }, // Cloudinary URL (preferred)
            publicId: { type: String }, // Cloudinary public ID for deletion
            data: { type: String }, // Base64 data (legacy, for backward compatibility)
            name: { type: String },
            mimeType: { type: String },
        },
        lastUpdated: { type: Date },
    },
    { _id: false }
);

const employeeVisaSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            ref: "EmployeeBasic"
        },

        // VISA DETAILS
        visit: { type: visaDocumentSchema, default: undefined },
        employment: { type: visaDocumentSchema, default: undefined },
        spouse: { type: visaDocumentSchema, default: undefined },
    },
    { timestamps: true }
);

// Index for faster queries
employeeVisaSchema.index({ "visit.expiryDate": 1 });
employeeVisaSchema.index({ "employment.expiryDate": 1 });
employeeVisaSchema.index({ "spouse.expiryDate": 1 });

// Ensure one visa record per employee
employeeVisaSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.model("EmployeeVisa", employeeVisaSchema);


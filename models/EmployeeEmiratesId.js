import mongoose from "mongoose";

/**
 * EmployeeEmiratesId - Emirates ID details
 * Contains: Number, Issue Date, Expiry Date, Attachment
 */
const emiratesIdDocumentSchema = new mongoose.Schema(
    {
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

const employeeEmiratesIdSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            ref: "EmployeeBasic"
        },

        // EMIRATES ID DETAILS
        emiratesId: { type: emiratesIdDocumentSchema, default: undefined },
    },
    { timestamps: true }
);

// Index for faster queries
employeeEmiratesIdSchema.index({ "emiratesId.expiryDate": 1 });

// Ensure one Emirates ID record per employee
employeeEmiratesIdSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.model("EmployeeEmiratesId", employeeEmiratesIdSchema);














import mongoose from "mongoose";

/**
 * EmployeeBank - Bank account details
 * Contains: Bank name, Account details, IBAN, SWIFT, etc.
 */
const employeeBankSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            ref: "EmployeeBasic"
        },

        // BANK DETAILS
        bankName: { type: String },
        accountName: { type: String },
        accountNumber: { type: String },
        ibanNumber: { type: String },
        swiftCode: { type: String },
        bankOtherDetails: { type: String },
        bankAttachment: {
            url: { type: String }, // Cloudinary URL (preferred)
            data: { type: String }, // Base64 data (legacy, for backward compatibility)
            name: { type: String },
            mimeType: { type: String },
        },
    },
    { timestamps: true }
);

// Index for faster queries
employeeBankSchema.index({ accountNumber: 1 });

// Ensure one bank record per employee
employeeBankSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.model("EmployeeBank", employeeBankSchema);


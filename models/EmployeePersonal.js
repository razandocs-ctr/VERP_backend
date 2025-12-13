import mongoose from "mongoose";

/**
 * EmployeePersonal - Personal details
 * Contains: Gender, Date of Birth, Marital Status, Nationality, Father's Name
 */
const employeePersonalSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            ref: "EmployeeBasic"
        },

        // PERSONAL DETAILS
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: true,
        },
        dateOfBirth: { type: Date },
        age: { type: Number },
        maritalStatus: { type: String },
        nationality: { type: String },
        fathersName: { type: String },
    },
    { timestamps: true }
);

// Index for faster queries
employeePersonalSchema.index({ nationality: 1 });

// Ensure one personal record per employee
employeePersonalSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.model("EmployeePersonal", employeePersonalSchema);


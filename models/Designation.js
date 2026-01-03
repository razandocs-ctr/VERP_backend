import mongoose from "mongoose";

const designationSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        department: {
            type: String,
            required: true,
            trim: true
        },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active"
        },
        isSystem: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Compound index to ensure unique designation per department
designationSchema.index({ name: 1, department: 1 }, { unique: true });

export default mongoose.model("Designation", designationSchema);

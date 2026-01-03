import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
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

export default mongoose.model("Department", departmentSchema);

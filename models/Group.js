import mongoose from "mongoose";

/**
 * Group Model - User groups for access control
 */
const groupSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        // Users assigned to this group
        users: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],

        // Module Permissions
        permissions: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        // Status
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active"
        },

        // Metadata
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

// Indexes
groupSchema.index({ status: 1 });
groupSchema.index({ users: 1 });

export default mongoose.model("Group", groupSchema);


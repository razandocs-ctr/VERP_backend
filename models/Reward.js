import mongoose from "mongoose";

/**
 * Reward Schema
 * Tracks employee rewards with auto-generated reward IDs
 */
const rewardSchema = new mongoose.Schema(
    {
        rewardId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        employeeId: {
            type: String,
            required: true,
            ref: "EmployeeBasic"
        },
        employeeName: {
            type: String,
            required: true
        },
        rewardType: {
            type: String,
            required: true,
            enum: ['Cash Reward', 'Gift Reward', 'Certificate', 'Performance Bonus', 'Employee of the Month', 'Long Service Award', 'Project Completion', 'Attendance Bonus', 'Other'],
            default: 'Other'
        },
        rewardStatus: {
            type: String,
            required: true,
            enum: ['Pending', 'Approved', 'Rejected', 'Cancelled', 'Active'],
            default: 'Pending'
        },
        amount: {
            type: Number,
            default: null
        },
        description: {
            type: String,
            default: ''
        },
        awardedDate: {
            type: Date,
            default: Date.now
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        approvedDate: {
            type: Date,
            default: null
        },
        remarks: {
            type: String,
            default: ''
        },
        title: {
            type: String,
            required: true
        }
    },
    { timestamps: true }
);

// Index for faster queries
rewardSchema.index({ employeeId: 1 });
rewardSchema.index({ rewardStatus: 1 });
rewardSchema.index({ rewardType: 1 });
rewardSchema.index({ createdAt: -1 });

export default mongoose.model("Reward", rewardSchema);


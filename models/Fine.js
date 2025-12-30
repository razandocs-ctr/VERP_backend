import mongoose from "mongoose";

/**
 * Fine Schema
 * Tracks employee fines with auto-generated fine IDs
 */
const fineSchema = new mongoose.Schema(
    {
        fineId: {
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
        category: {
            type: String,
            required: true,
            enum: ['Violation', 'Damage', 'Other'],
            default: 'Other'
        },
        subCategory: {
            type: String,
            default: ''
        },
        fineType: {
            type: String,
            default: 'Other'
        },
        vehicleId: {
            type: String,
            default: null
        },
        projectId: {
            type: String,
            default: null
        },
        projectName: {
            type: String,
            default: ''
        },
        engineerName: {
            type: String,
            default: ''
        },
        assignedEmployees: [{
            employeeId: {
                type: String,
                required: true
            },
            employeeName: {
                type: String,
                required: true
            },
            daysWorked: {
                type: Number,
                required: true,
                min: 1
            }
        }],
        responsibleFor: {
            type: String,
            enum: ['Employee', 'Company', 'Employee & Company', null],
            default: null
        },
        employeeAmount: {
            type: Number,
            default: 0
        },
        companyAmount: {
            type: Number,
            default: 0
        },
        payableDuration: {
            type: Number,
            min: 1,
            max: 6,
            default: null
        },
        monthStart: {
            type: String,
            default: ''
        },
        fineStatus: {
            type: String,
            required: true,
            enum: ['Pending', 'Approved', 'Active', 'Completed', 'Cancelled'],
            default: 'Pending'
        },
        fineAmount: {
            type: Number,
            required: true
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
        attachment: {
            url: { type: String },
            publicId: { type: String },
            data: { type: String },
            name: { type: String },
            mimeType: { type: String }
        }
    },
    { timestamps: true }
);

// Index for faster queries
fineSchema.index({ employeeId: 1 });
fineSchema.index({ fineStatus: 1 });
fineSchema.index({ fineType: 1 });
fineSchema.index({ createdAt: -1 });

export default mongoose.model("Fine", fineSchema);

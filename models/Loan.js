import mongoose from "mongoose";

const loanSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        ref: 'EmployeeBasic' // Assuming referencing by custom ID, but technically usually ObjectId
    },
    employeeObjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmployeeBasic',
        required: true
    },
    type: {
        type: String,
        enum: ['Loan', 'Advance'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    duration: {
        type: Number,
        required: true // in months
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Pending Authorization', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    approvalStatus: {
        type: String,
        enum: ['Pending', 'Pending Authorization', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    appliedDate: {
        type: Date,
        default: Date.now
    },
    approvedDate: {
        type: Date
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EmployeeBasic'
    }
}, { timestamps: true });

const Loan = mongoose.model("Loan", loanSchema);
export default Loan;

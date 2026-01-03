import mongoose from "mongoose";

/**
 * EmployeeTraining - Training details
 * Contains: Training history array
 */
const trainingDetailSchema = new mongoose.Schema(
    {
        trainingName: { type: String, required: true },
        trainingDetails: { type: String },
        provider: { type: String, required: true },
        trainingDate: { type: Date, required: true },
        trainingCost: { type: Number },
        trainingCertificate: {
            data: { type: String },
            name: { type: String },
            mimeType: { type: String }
        }
    },
    { _id: true }
);

const employeeTrainingSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            ref: "EmployeeBasic"
        },

        // TRAINING DETAILS
        trainingDetails: [trainingDetailSchema],
    },
    { timestamps: true }
);

// Index for faster queries
// Ensure one training record per employee
employeeTrainingSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.model("EmployeeTraining", employeeTrainingSchema);









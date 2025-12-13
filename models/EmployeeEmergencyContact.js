import mongoose from "mongoose";

/**
 * EmployeeEmergencyContact - Emergency contact information
 * Contains: Emergency contacts array
 */
const emergencyContactSchema = new mongoose.Schema(
    {
        name: { type: String },
        relation: { type: String, default: 'Self' },
        number: { type: String }
    },
    { _id: true }
);

const employeeEmergencyContactSchema = new mongoose.Schema(
    {
        employeeId: {
            type: String,
            required: true,
            ref: "EmployeeBasic"
        },

        // EMERGENCY CONTACTS
        emergencyContacts: [emergencyContactSchema],

        // Legacy fields for backward compatibility
        emergencyContactName: { type: String },
        emergencyContactRelation: { type: String, default: 'Self' },
        emergencyContactNumber: { type: String },
    },
    { timestamps: true }
);

// Index for faster queries
// Ensure one emergency contact record per employee
employeeEmergencyContactSchema.index({ employeeId: 1 }, { unique: true });

export default mongoose.model("EmployeeEmergencyContact", employeeEmergencyContactSchema);


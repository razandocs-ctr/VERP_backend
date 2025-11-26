import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
    {
        // BASIC INFO
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        employeeId: { type: String, required: true, unique: true }, // Ex: VITS001
        role: { type: String, required: true }, // HR Manager, Developer…
        department: { type: String, required: true }, // Administration, HR, IT…
        designation: { type: String, required: true },
        status: {
            type: String,
            enum: ["Probation", "Permanent", "Temporary", "Notice"],
            default: "Probation",
        },

        // LOGIN & ACCESS
        email: { type: String, required: true, unique: true },
        password: { type: String }, // hashed (only if enablePortalAccess is true)
        enablePortalAccess: { type: Boolean, default: false },

        // EMPLOYMENT INFO
        dateOfJoining: { type: Date, required: true },

        // CONTACT INFO
        contactNumber: { type: String, required: true },
        addressLine1: { type: String },
        addressLine2: { type: String },
        country: { type: String },
        state: { type: String },
        city: { type: String },
        postalCode: { type: String },

        // PERSONAL DETAILS
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            required: true,
        },
        dateOfBirth: { type: Date },
        age: { type: Number },
        nationality: { type: String },
        fathersName: { type: String },

        // DOCUMENT EXPIRY DETAILS
        passportExp: { type: Date },
        eidExp: { type: Date },
        medExp: { type: Date },

        // SALARY STRUCTURE
        monthlySalary: { type: Number, default: 0 },
        basic: { type: Number, default: 0 },
        basicPercentage: { type: Number, default: 60 }, // auto calculation possible
        houseRentAllowance: { type: Number, default: 0 },
        houseRentPercentage: { type: Number, default: 20 },
        otherAllowance: { type: Number, default: 0 },
        otherAllowancePercentage: { type: Number, default: 20 },
        additionalAllowances: [
            {
                type: { type: String },
                amount: { type: Number, default: 0 },
                percentage: { type: Number, default: 0 },
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model("Employee", employeeSchema);

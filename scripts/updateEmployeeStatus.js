import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Employee from "../models/Employee.js";

dotenv.config({ path: ".env" });

const statusMap = {
    active: "Permanent",
    permenent: "Permanent",
    permanent: "Permanent",
    probation: "Probation",
    temporary: "Temporary",
    temp: "Temporary",
    notice: "Notice",
    inactive: "Probation", // fallback for legacy values
};

const normalizeStatus = (status) => {
    if (!status) return "Probation";
    const key = status.toString().trim().toLowerCase();
    return statusMap[key] || "Probation";
};

const updateStatuses = async () => {
    try {
        await connectDB();

        const employees = await Employee.find({});
        let updatedCount = 0;

        for (const emp of employees) {
            const normalized = normalizeStatus(emp.status);
            if (emp.status !== normalized) {
                emp.status = normalized;
                await emp.save();
                updatedCount++;
            }
        }

        console.log(`✅ Status normalization complete. Updated ${updatedCount} employees.`);
    } catch (error) {
        console.error("❌ Failed to update employee statuses:", error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

updateStatuses();



import Employee from "../../models/Employee.js";
import mongoose from "mongoose";

export const updateProfileStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['draft', 'submitted', 'active'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        // Try to find by custom employeeId (e.g. VITS001) first, then fallback to _id
        let query = { employeeId: id };

        // If it looks like a Mongo ID, check that too
        if (mongoose.Types.ObjectId.isValid(id)) {
            query = { $or: [{ employeeId: id }, { _id: id }] };
        }

        const employee = await Employee.findOne(query);

        if (!employee) {
            console.log(`[updateProfileStatus] Employee not found for ID: ${id}`);
            return res.status(404).json({ message: "Employee not found" });
        }

        employee.profileApprovalStatus = status;

        // Sync profileStatus based on approval status
        if (status === 'draft') {
            employee.profileStatus = 'inactive';
        } else if (status === 'active') {
            employee.profileStatus = 'active';
        }

        await employee.save();

        console.log(`[updateProfileStatus] Updated status to ${status} for ${employee.employeeId}`);
        res.status(200).json({ message: "Profile status updated", status: employee.profileApprovalStatus });
    } catch (error) {
        console.error("Error updating profile status:", error);
        res.status(500).json({ message: "Server error" });
    }
};

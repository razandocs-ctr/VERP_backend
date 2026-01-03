import Employee from "../../models/Employee.js";

export const updateProfileStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['draft', 'submitted', 'active'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const employee = await Employee.findOne({ employeeId: id });

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        employee.profileApprovalStatus = status;
        await employee.save();

        res.status(200).json({ message: "Profile status updated", status: employee.profileApprovalStatus });
    } catch (error) {
        console.error("Error updating profile status:", error);
        res.status(500).json({ message: "Server error" });
    }
};

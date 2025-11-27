import Employee from "../../models/Employee.js";

export const approveProfile = async (req, res) => {
    const { id } = req.params;

    try {
        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        employee.profileApprovalStatus = "active";
        employee.profileStatus = "active";
        await employee.save();

        return res.status(200).json({
            message: "Employee profile marked as approved.",
            employee
        });
    } catch (error) {
        console.error("Failed to approve profile:", error);
        return res.status(500).json({ message: error.message || "Failed to approve profile." });
    }
};



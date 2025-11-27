import Employee from "../../models/Employee.js";

export const submitApproval = async (req, res) => {
    const { id } = req.params;

    try {
        const employee = await Employee.findById(id).populate("reportingAuthority");

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        if (!employee.reportingAuthority) {
            return res.status(400).json({ message: "Please assign a reporting authority before submitting for approval." });
        }

        employee.profileApprovalStatus = "submitted";
        await employee.save();

        return res.status(200).json({
            message: "Profile submitted for approval.",
            employee
        });
    } catch (error) {
        console.error("Failed to submit profile for approval:", error);
        return res.status(500).json({ message: error.message || "Failed to submit profile." });
    }
};



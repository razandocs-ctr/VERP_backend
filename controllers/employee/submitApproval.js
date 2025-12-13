import EmployeeBasic from "../../models/EmployeeBasic.js";
import { getCompleteEmployee } from "../../services/employeeService.js";

export const submitApproval = async (req, res) => {
    const { id } = req.params;

    try {
        // Get employeeId from employee record
        const employee = await getCompleteEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        if (!employee.reportingAuthority) {
            return res.status(400).json({ message: "Please assign a reporting authority before submitting for approval." });
        }

        const employeeId = employee.employeeId;

        // Update EmployeeBasic
        const updated = await EmployeeBasic.findOneAndUpdate(
            { employeeId },
            { profileApprovalStatus: "submitted" },
            { new: true }
        ).populate("reportingAuthority", "firstName lastName email workEmail");

        if (!updated) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Get complete employee data for response
        const completeEmployee = await getCompleteEmployee(employeeId);
        delete completeEmployee.password;

        return res.status(200).json({
            message: "Profile submitted for approval.",
            employee: completeEmployee
        });
    } catch (error) {
        console.error("Failed to submit profile for approval:", error);
        return res.status(500).json({ message: error.message || "Failed to submit profile." });
    }
};



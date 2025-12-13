import { deleteEmployeeData, getCompleteEmployee } from "../../services/employeeService.js";

// Delete employee
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get employeeId from employee record
        const employee = await getCompleteEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const employeeId = employee.employeeId;

        // Delete from all collections
        await deleteEmployeeData(employeeId);

        return res.status(200).json({
            message: "Employee deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};




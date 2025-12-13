import { getCompleteEmployee } from "../../services/employeeService.js";

// Get single employee by ID
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await getCompleteEmployee(id);

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Remove password from response
        delete employee.password;

        return res.status(200).json({
            message: "Employee fetched successfully",
            employee,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};




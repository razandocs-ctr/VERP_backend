import { getCompleteEmployee } from "../../services/employeeService.js";

// Get single employee by ID
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || id.trim() === '') {
            return res.status(400).json({ message: "Employee ID is required" });
        }
        
        console.log(`[getEmployeeById] Fetching employee with ID: ${id}`);
        const employee = await getCompleteEmployee(id);

        if (!employee) {
            console.log(`[getEmployeeById] Employee not found: ${id}`);
            return res.status(404).json({ message: "Employee not found" });
        }

        // Remove password from response
        if (employee.password) {
            delete employee.password;
        }

        console.log(`[getEmployeeById] Successfully fetched employee: ${employee.employeeId || id}`);
        
        // Calculate approximate response size for logging
        const responseSize = JSON.stringify(employee).length;
        console.log(`[getEmployeeById] Response size: ${(responseSize / 1024).toFixed(2)} KB`);
        
        // Set response headers for better handling
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Length', responseSize);
        
        return res.status(200).json({
            message: "Employee fetched successfully",
            employee,
        });
    } catch (error) {
        console.error('[getEmployeeById] Error:', error);
        console.error('[getEmployeeById] Stack:', error.stack);
        return res.status(500).json({ 
            message: error.message || "Internal server error while fetching employee",
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};




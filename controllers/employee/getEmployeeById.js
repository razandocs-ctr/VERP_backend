import Employee from "../../models/Employee.js";

// Get single employee by ID
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await Employee.findById(id).select('-password');
        
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        
        return res.status(200).json({
            message: "Employee fetched successfully",
            employee,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};




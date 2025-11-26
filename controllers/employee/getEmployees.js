import Employee from "../../models/Employee.js";

// Get all employees
export const getEmployees = async (req, res) => {
    try {
        const employees = await Employee.find({}).select('-password').sort({ createdAt: -1 });
        return res.status(200).json({
            message: "Employees fetched successfully",
            employees,
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};




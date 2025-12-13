import User from "../../models/User.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import { getUserPermissions } from "../../services/permissionService.js";

// Get single user by ID
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate MongoDB ObjectId format
        if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        const user = await User.findById(id)
            .select('-password')
            .populate('group', 'name');

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // If user has employeeId, fetch employee details including designation
        let employee = null;
        let designation = null;
        if (user.employeeId) {
            try {
                employee = await EmployeeBasic.findOne({ employeeId: user.employeeId })
                    .select('employeeId firstName lastName email designation');
                if (employee) {
                    designation = employee.designation;
                }
            } catch (empError) {
                console.error('Error fetching employee:', empError);
                // Continue without employee data if fetch fails
            }
        }

        // Get user permissions
        const permissions = await getUserPermissions(id);

        const userResponse = {
            ...user.toObject(),
            employee: employee,
            designation: designation,
            permissions: permissions
        };

        return res.status(200).json({
            message: "User fetched successfully",
            user: userResponse,
        });
    } catch (error) {
        console.error('Error in getUserById:', error);
        return res.status(500).json({
            message: error.message || "Internal server error",
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};


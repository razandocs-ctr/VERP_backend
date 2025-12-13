import User from "../../models/User.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import Group from "../../models/Group.js";
import bcrypt from "bcryptjs";

// Create new user
export const createUser = async (req, res) => {
    try {
        const {
            username,
            name,
            email,
            password,
            employeeId,
            group,
            status = 'Active',
            enablePortalAccess = true,
            isAdmin = false
        } = req.body;

        // Validate required fields
        if (!username || !name || !email || !password) {
            return res.status(400).json({
                message: "Username, name, email, and password are required"
            });
        }

        // Validate password requirements
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters"
            });
        }
        if (!/[A-Z]/.test(password)) {
            return res.status(400).json({
                message: "Password must contain at least one uppercase letter"
            });
        }
        if (!/[a-z]/.test(password)) {
            return res.status(400).json({
                message: "Password must contain at least one lowercase letter"
            });
        }
        if (!/[0-9]/.test(password)) {
            return res.status(400).json({
                message: "Password must contain at least one number"
            });
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ username: username.trim() });
        if (existingUsername) {
            return res.status(400).json({ message: "Username already exists" });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingEmail) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // If employeeId is provided, verify employee exists
        if (employeeId) {
            const employee = await EmployeeBasic.findOne({ employeeId });
            if (!employee) {
                return res.status(400).json({ message: "Employee not found" });
            }

            // Check if employee is already a user
            const existingUser = await User.findOne({ employeeId });
            if (existingUser) {
                return res.status(400).json({ message: "This employee is already a user" });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Get group name if group is provided
        let groupName = null;
        if (group) {
            const groupDoc = await Group.findById(group);
            if (!groupDoc) {
                return res.status(400).json({ message: "Group not found" });
            }
            groupName = groupDoc.name;
        }

        // Calculate password expiry date (180 days from now)
        const passwordExpiryDate = new Date();
        passwordExpiryDate.setDate(passwordExpiryDate.getDate() + 180);

        // Create user
        const newUser = new User({
            username: username.trim(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            employeeId: employeeId || null,
            group: group || null,
            groupName: groupName || null,
            status: status,
            enablePortalAccess: enablePortalAccess,
            isAdmin: isAdmin || false,
            passwordExpiryDate: passwordExpiryDate,
        });

        const savedUser = await newUser.save();

        // Remove password from response
        const userResponse = savedUser.toObject();
        delete userResponse.password;

        return res.status(201).json({
            message: "User created successfully",
            user: userResponse,
        });
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                message: `${field} already exists`
            });
        }
        return res.status(500).json({
            message: error.message || 'Internal server error'
        });
    }
};


import User from "../../models/User.js";
import Group from "../../models/Group.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import bcrypt from "bcryptjs";

// Update user
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            username,
            name,
            email,
            password,
            employeeId,
            group,
            status,
            enablePortalAccess,
            isAdmin
        } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if this is the system admin user
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const isSystemAdmin = user.username?.toLowerCase() === adminUsername.toLowerCase();

        // For system admin, only allow password updates
        if (isSystemAdmin) {
            if (password === undefined) {
                return res.status(400).json({ 
                    message: "Only password can be updated for system admin user" 
                });
            }
            // Only update password for admin user
            const isSamePassword = await bcrypt.compare(password, user.password);
            if (isSamePassword) {
                return res.status(400).json({
                    message: "New password must be different from the current password"
                });
            }
            user.password = await bcrypt.hash(password, 10);
            await user.save();
            return res.status(200).json({
                message: "Password updated successfully",
                user: await User.findById(id).select('-password').populate('group', 'name')
            });
        }

        // Build update object
        const updateData = {};

        if (username !== undefined) {
            const newUsername = username.trim();
            // Check if username is already taken by another user
            if (newUsername !== user.username) {
                const existingUsername = await User.findOne({ username: newUsername });
                if (existingUsername) {
                    return res.status(400).json({ message: "Username already exists" });
                }
            }
            updateData.username = newUsername;
        }
        if (name !== undefined) updateData.name = name.trim();
        if (email !== undefined) {
            const newEmail = email.trim().toLowerCase();
            // Check if email is already taken by another user
            if (newEmail !== user.email) {
                const existingEmail = await User.findOne({ email: newEmail });
                if (existingEmail) {
                    return res.status(400).json({ message: "Email already exists" });
                }
            }
            updateData.email = newEmail;
        }
        if (password !== undefined) {
            // Password validation is done separately via validate-password endpoint
            // This is kept as a backup check
            const isSamePassword = await bcrypt.compare(password, user.password);
            if (isSamePassword) {
                return res.status(400).json({
                    message: "New password must be different from the current password"
                });
            }
            updateData.password = await bcrypt.hash(password, 10);
        }
        if (employeeId !== undefined) {
            if (employeeId) {
                const employee = await EmployeeBasic.findOne({ employeeId });
                if (!employee) {
                    return res.status(400).json({ message: "Employee not found" });
                }
                // Check if another user already has this employeeId
                const existingUser = await User.findOne({ employeeId, _id: { $ne: id } });
                if (existingUser) {
                    return res.status(400).json({ message: "This employee is already assigned to another user" });
                }
            }
            updateData.employeeId = employeeId || null;
        }
        if (group !== undefined) {
            updateData.group = group || null;
            // Update group name
            if (group) {
                const groupDoc = await Group.findById(group);
                if (!groupDoc) {
                    return res.status(400).json({ message: "Group not found" });
                }
                updateData.groupName = groupDoc.name;
            } else {
                updateData.groupName = null;
            }
        }
        if (status !== undefined) updateData.status = status;
        if (enablePortalAccess !== undefined) updateData.enablePortalAccess = enablePortalAccess;
        if (isAdmin !== undefined) updateData.isAdmin = isAdmin;

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password').populate('group', 'name');

        return res.status(200).json({
            message: "User updated successfully",
            user: updatedUser,
        });
    } catch (error) {
        console.error('Error updating user:', error);
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


import Group from "../../models/Group.js";
import User from "../../models/User.js";
import { isUserAdministrator } from "../../services/permissionService.js";
import { escapeRegex } from "../../utils/regexHelper.js";

// Update group
export const updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, users, permissions, status } = req.body;
        const userId = req.user?.id;

        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Check if this is a system group (like Admin)
        if (group.isSystemGroup) {
            // Only admin users can modify system groups
            const isAdmin = await isUserAdministrator(userId);
            if (!isAdmin) {
                return res.status(403).json({
                    message: "Cannot modify system group. Only administrators can modify this group."
                });
            }

            // Prevent changing name or isSystemGroup flag for system groups
            if (name !== undefined && (typeof name !== 'string' || name.trim().toLowerCase() !== group.name.toLowerCase())) {
                return res.status(403).json({
                    message: "Cannot change the name of a system group."
                });
            }
        }

        const updateData = {};
        let newName = group.name;

        if (name !== undefined) {
            if (typeof name !== 'string') {
                return res.status(400).json({ message: "Group name must be a string" });
            }
            newName = name.trim();
            // Check if name is already taken by another group
            if (newName !== group.name) {
                const existingGroup = await Group.findOne({
                    name: { $regex: new RegExp(`^${escapeRegex(newName)}$`, 'i') },
                    _id: { $ne: id }
                });
                if (existingGroup) {
                    return res.status(400).json({ message: "Group name already exists" });
                }
            }
            updateData.name = newName;
        }
        if (permissions !== undefined) updateData.permissions = permissions;
        if (status !== undefined) updateData.status = status;

        // Handle users update
        // Only update users if explicitly provided and not empty
        // If users is empty array or not provided, preserve existing users
        if (users !== undefined && users !== null && Array.isArray(users)) {
            let normalizedUserIds = [];

            // Only process if users array is not empty
            if (users.length > 0) {
                // If this is a system group (like Admin), only admin users can assign users to it
                if (group.isSystemGroup) {
                    const isAdmin = await isUserAdministrator(userId);
                    if (!isAdmin) {
                        return res.status(403).json({
                            message: "Only administrators can assign users to system groups."
                        });
                    }
                }
                // Remove all users from this group first (only if we're assigning new users)
                await User.updateMany(
                    { group: id },
                    { $set: { group: null, groupName: null } }
                );
                // Normalize users array - extract IDs if they're objects
                normalizedUserIds = users.map(user => {
                    // If it's already a string, use it directly
                    if (typeof user === 'string') {
                        const trimmed = user.trim();
                        return trimmed && trimmed !== 'null' && trimmed !== 'undefined' ? trimmed : null;
                    }

                    // If it's an object, extract the ID
                    if (user && typeof user === 'object') {
                        // Try to get _id or id property
                        const userId = user._id || user.id;
                        if (userId) {
                            // If userId is an object (like ObjectId), convert to string
                            const idString = userId.toString ? userId.toString() : String(userId);
                            return idString && idString !== 'null' && idString !== 'undefined' ? idString.trim() : null;
                        }
                        return null;
                    }

                    // For other types, try to convert to string
                    if (user != null) {
                        const idString = user.toString ? user.toString() : String(user);
                        // Check if it's "[object Object]" which means conversion failed
                        if (idString === '[object Object]') {
                            console.error('Failed to extract ID from user:', user);
                            return null;
                        }
                        return idString.trim();
                    }

                    return null;
                }).filter(id => id != null && id !== '' && id !== 'null' && id !== 'undefined' && id !== '[object Object]'); // Remove invalid values

                // Validate that all users exist
                const usersToAssign = await User.find({ _id: { $in: normalizedUserIds } });
                if (usersToAssign.length !== normalizedUserIds.length) {
                    return res.status(400).json({ message: "One or more users not found" });
                }

                // Check if any user already has a different group
                const usersWithGroup = usersToAssign.filter(u => u.group && u.group.toString() !== id.toString());
                if (usersWithGroup.length > 0) {
                    return res.status(400).json({
                        message: "One or more users are already assigned to another group"
                    });
                }

                // Update users to assign them to this group
                await User.updateMany(
                    { _id: { $in: normalizedUserIds } },
                    {
                        $set: {
                            group: id,
                            groupName: newName
                        }
                    }
                );

                // Normalize users array for storage
                updateData.users = normalizedUserIds;
            } else {
                // If users array is empty, preserve existing users - don't update the users field
                // This means existing users will keep their group assignment
                // Sync the Group model's users array with actual users having this group
                const existingUsers = await User.find({ group: id }).select('_id').lean();
                updateData.users = existingUsers.map(u => u._id);
            }
        } else {
            // If users is not provided (undefined), preserve existing users
            // Sync the Group model's users array with actual users having this group
            const existingUsers = await User.find({ group: id }).select('_id').lean();
            updateData.users = existingUsers.map(u => u._id);
        }

        const updatedGroup = await Group.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        // Update groupName in all users with this group (if name changed)
        if (name !== undefined) {
            await User.updateMany(
                { group: id },
                { $set: { groupName: newName } }
            );
        }

        return res.status(200).json({
            message: "Group updated successfully",
            group: updatedGroup,
        });
    } catch (error) {
        console.error('Error updating group:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Group name already exists"
            });
        }
        return res.status(500).json({
            message: error.message || 'Internal server error'
        });
    }
};


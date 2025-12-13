import Group from "../../models/Group.js";
import User from "../../models/User.js";

// Create new group
export const createGroup = async (req, res) => {
    try {
        const { name, users = [], permissions = {}, status = 'Active' } = req.body;

        if (!name || name.trim() === '') {
            return res.status(400).json({
                message: "Group name is required"
            });
        }

        // Check if group name already exists
        const existingGroup = await Group.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
        });
        if (existingGroup) {
            return res.status(400).json({ message: "Group name already exists" });
        }

        // Validate that all users exist and don't already have a group
        if (users && users.length > 0) {
            // Normalize users array - extract IDs if they're objects
            const userIds = users.map(user => {
                if (typeof user === 'string') {
                    return user;
                } else if (user && typeof user === 'object') {
                    // If it's an object, try to get _id or id
                    return user._id || user.id || user;
                }
                return user;
            }).filter(id => id != null); // Remove null/undefined values

            const usersToAssign = await User.find({ _id: { $in: userIds } });
            if (usersToAssign.length !== userIds.length) {
                return res.status(400).json({ message: "One or more users not found" });
            }

            // Check if any user already has a group
            const usersWithGroup = usersToAssign.filter(u => u.group);
            if (usersWithGroup.length > 0) {
                return res.status(400).json({
                    message: "One or more users are already assigned to a group"
                });
            }
        }

        // Normalize users array for storage
        const normalizedUsers = users && users.length > 0
            ? users.map(user => {
                if (typeof user === 'string') {
                    return user;
                } else if (user && typeof user === 'object') {
                    return user._id || user.id || user;
                }
                return user;
            }).filter(id => id != null)
            : [];

        // Create group with permissions as Map
        const newGroup = new Group({
            name: name.trim(),
            users: normalizedUsers,
            permissions: permissions || {},
            status: status,
        });

        const savedGroup = await newGroup.save();

        // Update users to assign them to this group
        if (normalizedUsers && normalizedUsers.length > 0) {
            await User.updateMany(
                { _id: { $in: normalizedUsers } },
                {
                    $set: {
                        group: savedGroup._id,
                        groupName: savedGroup.name
                    }
                }
            );
        }

        return res.status(201).json({
            message: "Group created successfully",
            group: savedGroup,
        });
    } catch (error) {
        console.error('Error creating group:', error);
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


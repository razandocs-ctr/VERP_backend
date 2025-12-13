import User from "../../models/User.js";
import Group from "../../models/Group.js";

// Delete user
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // If user is in a group, remove them from the group's users array
        if (user.group) {
            await Group.findByIdAndUpdate(
                user.group,
                { $pull: { users: id } }
            );
        }

        // Delete the user
        await User.findByIdAndDelete(id);

        return res.status(200).json({
            message: "User deleted successfully",
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({
            message: error.message || 'Internal server error'
        });
    }
};



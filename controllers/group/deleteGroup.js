import Group from "../../models/Group.js";
import User from "../../models/User.js";

// Delete group
export const deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;

        const group = await Group.findById(id);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // Remove group reference from all users assigned to this group
        await User.updateMany(
            { group: id },
            { $set: { group: null, groupName: null } }
        );

        // Delete the group
        await Group.findByIdAndDelete(id);

        return res.status(200).json({
            message: "Group deleted successfully",
        });
    } catch (error) {
        console.error('Error deleting group:', error);
        return res.status(500).json({
            message: error.message || 'Internal server error'
        });
    }
};



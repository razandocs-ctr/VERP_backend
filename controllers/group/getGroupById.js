import Group from "../../models/Group.js";

// Get group by ID
export const getGroupById = async (req, res) => {
    try {
        const { id } = req.params;

        const group = await Group.findById(id)
            .populate('users', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email');

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        return res.status(200).json({
            message: "Group fetched successfully",
            group,
        });
    } catch (error) {
        console.error('Error fetching group:', error);
        return res.status(500).json({
            message: error.message || 'Internal server error'
        });
    }
};



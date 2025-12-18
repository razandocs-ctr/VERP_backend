import Group from "../../models/Group.js";

// Get all groups
export const getGroups = async (req, res) => {
    try {
        const { status, search } = req.query;

        // Build filter
        const filter = {};
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.name = { $regex: new RegExp(search, 'i') };
        }

        const groups = await Group.find(filter)
            .populate('users', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Groups fetched successfully",
            groups,
        });
    } catch (error) {
        console.error('Error fetching groups:', error);
        return res.status(500).json({
            message: error.message || 'Internal server error'
        });
    }
};
















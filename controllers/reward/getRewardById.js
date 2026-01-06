import Reward from "../../models/Reward.js";

export const getRewardById = async (req, res) => {
    try {
        const { id } = req.params;

        const reward = await Reward.findById(id)
            .populate({
                path: 'approvedBy',
                select: 'name username',
                options: { lean: true }
            })
            .lean();

        if (!reward) {
            return res.status(404).json({ message: "Reward not found" });
        }

        return res.status(200).json({
            message: "Reward fetched successfully",
            reward
        });
    } catch (error) {
        console.error('Error fetching reward:', error);
        
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                message: "Invalid reward ID" 
            });
        }
        
        return res.status(500).json({ 
            message: error.message || "Failed to fetch reward" 
        });
    }
};







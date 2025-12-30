import Fine from "../../models/Fine.js";

export const updateFine = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const fine = await Fine.findById(id);
        if (!fine) {
            return res.status(404).json({ message: "Fine not found" });
        }

        // Update fields
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                fine[key] = updates[key];
            }
        });

        const updatedFine = await fine.save();

        return res.status(200).json({
            message: "Fine updated successfully",
            fine: updatedFine
        });
    } catch (error) {
        console.error('Error updating fine:', error);
        return res.status(500).json({
            message: "Failed to update fine",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

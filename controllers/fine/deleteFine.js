import Fine from "../../models/Fine.js";

export const deleteFine = async (req, res) => {
    try {
        const fine = await Fine.findByIdAndDelete(req.params.id);
        if (!fine) {
            return res.status(404).json({ message: "Fine not found" });
        }
        return res.status(200).json({ message: "Fine record deleted successfully" });
    } catch (error) {
        console.error('Error deleting fine:', error);
        return res.status(500).json({
            message: "Failed to delete fine record",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

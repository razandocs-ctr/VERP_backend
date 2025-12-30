import Fine from "../../models/Fine.js";

export const getFineById = async (req, res) => {
    try {
        const fine = await Fine.findById(req.params.id).lean();
        if (!fine) {
            return res.status(404).json({ message: "Fine not found" });
        }
        return res.status(200).json(fine);
    } catch (error) {
        console.error('Error fetching fine:', error);
        return res.status(500).json({
            message: "Failed to fetch fine details",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

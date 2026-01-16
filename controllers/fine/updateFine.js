import Fine from "../../models/Fine.js";
import { sendFineRejectedEmail } from "../../utils/sendFineRejectedEmail.js";
import { isValidStorageUrl } from "../../utils/validationHelper.js";

export const updateFine = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const fine = await Fine.findById(id);
        if (!fine) {
            return res.status(404).json({ message: "Fine not found" });
        }

        // Update fields
        const oldStatus = fine.fineStatus;
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                fine[key] = updates[key];
            }
        });

        const updatedFine = await fine.save();

        // If newly rejected, send notification
        if (oldStatus !== 'Rejected' && updatedFine.fineStatus === 'Rejected') {
            try {
                if (updatedFine.attachment && updatedFine.attachment.url) {
                    if (!isValidStorageUrl(updatedFine.attachment.url)) {
                        console.warn('Skipping email due to invalid attachment URL hostname');
                        return; // Skip email to prevent SSRF
                    }
                }
                await sendFineRejectedEmail(updatedFine, updatedFine.assignedEmployees);
            } catch (err) {
                console.error("Failed to send rejection email:", err);
            }
        }

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

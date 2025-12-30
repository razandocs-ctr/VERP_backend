import Reward from "../../models/Reward.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";

export const updateReward = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            employeeId,
            rewardType,
            rewardStatus,
            amount,
            description,
            awardedDate,
            remarks
        } = req.body;

        const reward = await Reward.findById(id);
        if (!reward) {
            return res.status(404).json({ message: "Reward not found" });
        }

        // If employeeId is being updated, verify employee exists and update name
        if (employeeId && employeeId !== reward.employeeId) {
            const employee = await EmployeeBasic.findOne({ employeeId }).select('firstName lastName employeeId').lean();
            if (!employee) {
                return res.status(404).json({ message: "Employee not found" });
            }
            reward.employeeId = employeeId;
            reward.employeeName = `${employee.firstName} ${employee.lastName}`;
        }

        // Update fields
        if (rewardType) reward.rewardType = rewardType;
        if (rewardStatus !== undefined) {
            reward.rewardStatus = rewardStatus;
            
            // If status is being approved, set approvedBy and approvedDate
            if (rewardStatus === 'Approved' && !reward.approvedBy) {
                reward.approvedBy = req.user?._id || null;
                reward.approvedDate = new Date();
            }
        }
        if (amount !== undefined) reward.amount = amount;
        if (description !== undefined) reward.description = description;
        if (awardedDate) reward.awardedDate = new Date(awardedDate);
        if (remarks !== undefined) reward.remarks = remarks;

        await reward.save();

        return res.status(200).json({
            message: "Reward updated successfully",
            reward
        });
    } catch (error) {
        console.error('Error updating reward:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: `Validation error: ${error.message}` 
            });
        }
        
        return res.status(500).json({ 
            message: error.message || "Failed to update reward" 
        });
    }
};




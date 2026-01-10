import Fine from "../../models/Fine.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";

export const getFineById = async (req, res) => {
    try {
        const { id } = req.params;
        let fine;

        // Check if id is a valid MongoDB ObjectId
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);

        if (isValidObjectId) {
            // Try matching either _id or fineId (in case fineId happens to look like an objectId, unlikely but safe)
            fine = await Fine.findOne({
                $or: [{ _id: id }, { fineId: id }]
            }).lean();
        } else {
            // Not an ObjectId, so must be a custom fineId
            fine = await Fine.findOne({ fineId: id }).lean();
        }

        if (!fine) {
            return res.status(404).json({ message: "Fine not found" });
        }

        // Populate Manager Info for Frontend Permission Check
        if (fine.assignedEmployees && fine.assignedEmployees.length > 0) {
            const empIds = fine.assignedEmployees.map(e => e.employeeId);
            const employees = await EmployeeBasic.find({ employeeId: { $in: empIds } })
                .select('employeeId primaryReportee')
                .populate('primaryReportee', 'email companyEmail firstName lastName employeeId')
                .lean();

            // Merge back
            fine.assignedEmployees = fine.assignedEmployees.map(assigned => {
                const empDetails = employees.find(e => e.employeeId === assigned.employeeId);
                return {
                    ...assigned,
                    managerInfo: empDetails?.primaryReportee || null
                };
            });
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

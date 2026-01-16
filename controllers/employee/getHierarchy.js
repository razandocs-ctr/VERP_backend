import EmployeeBasic from "../../models/EmployeeBasic.js";
import mongoose from "mongoose";

/**
 * Get Employee Hierarchy
 * Returns a flat list of all reportees (direct and indirect) for the logged-in user.
 * Each entry includes 'depth' relative to the logged-in user.
 */
export const getHierarchy = async (req, res) => {
    try {
        const currentUser = req.user;
        if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

        // Identify the "Manager" record for the current user
        const manager = await EmployeeBasic.findOne({
            $or: [{ employeeId: currentUser.employeeId }, { companyEmail: currentUser.companyEmail }]
        }).select('_id firstName lastName employeeId designation profilePicture');

        if (!manager) {
            return res.status(200).json({ hierarchy: [] });
        }

        // Recursive lookup using $graphLookup
        const hierarchy = await EmployeeBasic.aggregate([
            {
                $match: { _id: manager._id }
            },
            {
                $graphLookup: {
                    from: "employeebasics",
                    startWith: "$_id",
                    connectFromField: "_id",
                    connectToField: "primaryReportee",
                    as: "team",
                    depthField: "depth"
                }
            },
            {
                $unwind: "$team"
            },
            {
                $project: {
                    _id: "$team._id",
                    firstName: "$team.firstName",
                    lastName: "$team.lastName",
                    employeeId: "$team.employeeId",
                    designation: "$team.designation",
                    department: "$team.department",
                    profilePicture: "$team.profilePicture",
                    primaryReportee: "$team.primaryReportee", // To reconstruct tree frontend-side if needed
                    depth: "$team.depth" // 0 = direct report, 1 = skip level, etc.
                }
            },
            {
                $sort: { depth: 1, firstName: 1 }
            }
        ]);

        return res.status(200).json({
            manager,
            hierarchy // Flat list of all downstream employees
        });

    } catch (error) {
        console.error("Get Hierarchy Error:", error);
        res.status(500).json({ message: "Failed to fetch hierarchy" });
    }
};

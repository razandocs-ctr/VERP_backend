import Fine from "../../models/Fine.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import { sendFineConfirmedEmail } from "../../utils/sendFineConfirmedEmail.js";

/**
 * Approve Fine for Specific Employees
 * Allows a Manager to approve fine for their reportees.
 * Updates main Fine status only if ALL employees are approved.
 */
export const approveFine = async (req, res) => {
    const { id } = req.params;
    const { companyEmail } = req.user; // Logged-in Manager's Email (or ID depending on auth)

    try {
        // 1. Fetch Fine
        let fine;
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        if (isValidObjectId) {
            fine = await Fine.findOne({ $or: [{ _id: id }, { fineId: id }] });
        } else {
            fine = await Fine.findOne({ fineId: id });
        }

        if (!fine) {
            return res.status(404).json({ message: "Fine not found" });
        }

        // 2. Identify Logged-In Manager (User)
        // We need to know who the logged-in user is in terms of Employee Hierarchy.
        // Assuming req.user contains 'companyEmail' or 'employeeId' linked to EmployeeBasic.
        // Let's find the EmployeeBasic record for the logged-in user to be sure.

        let managerBasic;
        console.log('[ApproveFine] Req User:', {
            id: req.user._id,
            email: req.user.email,
            companyEmail: req.user.companyEmail,
            role: req.user.role,
            empId: req.user.employeeId
        });

        if (req.user.employeeId) {
            managerBasic = await EmployeeBasic.findOne({ employeeId: req.user.employeeId });
        } else if (req.user.companyEmail) {
            managerBasic = await EmployeeBasic.findOne({ companyEmail: req.user.companyEmail });
        } else if (req.user.email) {
            // Fallback: User model usually has 'email'
            managerBasic = await EmployeeBasic.findOne({ companyEmail: req.user.email });
        }

        console.log('[ApproveFine] Found ManagerBasic:', managerBasic ? managerBasic.employeeId : 'NULL');

        if (!managerBasic) {
            // Fallback: If current user is Admin/SuperAdmin, they might not have an EmployeeBasic record
            // but should be allowed to approve EVERYTHING.
            if (req.user.role === 'Admin' || req.user.role === 'SuperAdmin') {
                // Admin Override
                managerBasic = { _id: req.user._id, isAdmin: true };
                console.log('[ApproveFine] Using Admin Override');
            } else {
                return res.status(403).json({
                    message: "You are not recognized as an employee/manager.",
                    debug: `User Email: ${req.user.email || req.user.companyEmail}`
                });
            }
        }

        // 3. Check Assigned Employees and Approve Reportees
        let modified = false;
        let allApproved = true;

        // Fetch full details of assigned employees to check their Primary Reportee
        const assignedIds = fine.assignedEmployees.map(e => e.employeeId);
        const fullAssigned = await EmployeeBasic.find({ employeeId: { $in: assignedIds } })
            .select('employeeId primaryReportee')
            .populate('primaryReportee') // to check ID match
            .lean();

        for (let assigned of fine.assignedEmployees) {
            // Find full details
            const fullEmp = fullAssigned.find(fe => fe.employeeId === assigned.employeeId);

            // Check if actionable (Pending)
            if (assigned.approvalStatus === 'Pending') {
                let canApprove = false;

                if (managerBasic.isAdmin) {
                    canApprove = true;
                } else if (fullEmp && fullEmp.primaryReportee) {
                    // Check if Manager Matches
                    // Case A: primaryReportee is populated Object -> check _id or companyEmail
                    // Case B: primaryReportee is ID -> check _id

                    const pRep = fullEmp.primaryReportee;
                    const pRepId = pRep._id ? pRep._id.toString() : pRep.toString();
                    const managerId = managerBasic._id.toString();

                    if (pRepId === managerId) {
                        canApprove = true;
                    }
                }

                if (canApprove) {
                    assigned.approvalStatus = 'Approved';
                    assigned.approvedBy = req.user._id;
                    assigned.approvedAt = new Date();
                    modified = true;
                }
            }

            // Check if STILL pending (after potential approval)
            if (assigned.approvalStatus !== 'Approved') {
                allApproved = false;
            }
        }

        if (!modified) {
            return res.status(400).json({ message: "No pending approvals found for your reportees." });
        }

        // 4. Update Main Status if All Approved
        if (allApproved) {
            fine.fineStatus = 'Approved';
            fine.approvedBy = req.user._id; // Last approver (or sets it generally)
            fine.approvedDate = new Date();

            // Send Confirmation Email to Employees
            try {
                // We pass fine and the list of assigned employees
                await sendFineConfirmedEmail(fine, fine.assignedEmployees);
            } catch (emailErr) {
                console.error("Failed to trigger confirmation email:", emailErr);
            }
        }

        await fine.save();

        return res.status(200).json({
            message: "Fine approved successfully.",
            fine
        });

    } catch (error) {
        console.error("Error approving fine:", error);
        return res.status(500).json({ message: error.message || "Failed to approve fine" });
    }
};

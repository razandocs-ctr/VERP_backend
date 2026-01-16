import Fine from "../../models/Fine.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import { sendFineConfirmedEmail } from "../../utils/sendFineConfirmedEmail.js";
import { getManagementHOD } from "../../utils/getManagementHOD.js";
import { sendHODAuthorizationEmail } from "../../utils/sendHODAuthorizationEmail.js";
import { isValidStorageUrl } from "../../utils/validationHelper.js";

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

            // Check if actionable (Pending or Pending Authorization)
            // 'Pending Authorization' means Reportee approved, waiting for HOD.
            const currentStatus = assigned.approvalStatus;

            if (currentStatus === 'Pending' || currentStatus === 'Pending Authorization') {
                let actionTaken = false;

                // Identification Logic
                // 1. Is Admin? -> Can do anything.
                // 2. Is Reportee? -> Can move Pending -> Pending Authorization
                // 3. Is HOD? -> Can move Pending Authorization -> Approved (or Pending -> Approved if direct)

                // Check Admin
                if (managerBasic.isAdmin) {
                    assigned.approvalStatus = 'Approved';
                    assigned.approvedBy = req.user._id;
                    assigned.approvedAt = new Date();
                    actionTaken = true;
                    modified = true;
                } else {
                    // Check CEO Validity (Strict HOD)
                    const isCEO = managerBasic.department && managerBasic.department.toLowerCase() === 'management' &&
                        ['ceo', 'c.e.o', 'c.e.o.', 'director', 'managing director', 'general manager'].includes(managerBasic.designation?.toLowerCase());

                    // Check Reportee Match
                    let isReporteeManager = false;
                    if (fullEmp && fullEmp.primaryReportee) {
                        const pRep = fullEmp.primaryReportee;
                        const pRepId = pRep._id ? pRep._id.toString() : pRep.toString();
                        if (pRepId === managerBasic._id.toString()) {
                            isReporteeManager = true;
                        }
                    }

                    // Logic Application: Force 2-Stage Flow
                    if (isCEO) {
                        // Stage 2: CEO can approve "Pending Authorization" items
                        if (currentStatus === 'Pending Authorization') {
                            assigned.approvalStatus = 'Approved';
                            assigned.approvedBy = req.user._id;
                            assigned.approvedAt = new Date();
                            actionTaken = true;
                            modified = true;
                        } else if (currentStatus === 'Pending' && isReporteeManager) {
                            // EDGE CASE: If CEO happens to be the Reportee Manager too
                            // They can technically fast-track? Or logic forces flow?
                            // User request: "Reportee -> Pending Auth -> CEO -> Approved"
                            // If CEO IS the reportee, they are doing Stage 1.
                            // But since they are CEO, they can arguably do Stage 2 immediately or implicitly.
                            // Let's allow CEO to full approve direct reportees for efficiency?
                            // OR strictly follow: 
                            // If I am CEO and it's Pending, I am acting as Reportee -> Pending Auth.
                            // Then I see it's Pending Auth and I am CEO -> I can Approve.
                            // Let's do instant approval for CEO to avoid double-clicking.
                            assigned.approvalStatus = 'Approved';
                            assigned.approvedBy = req.user._id;
                            assigned.approvedAt = new Date();
                            actionTaken = true;
                            modified = true;
                        }
                    } else if (isReporteeManager) {
                        // Stage 1: Reportee Manager moves 'Pending' -> 'Pending Authorization'
                        if (currentStatus === 'Pending') {
                            assigned.approvalStatus = 'Pending Authorization';
                            actionTaken = true;
                            modified = true;
                        }
                    }
                }
            }
        }

        if (!modified) {
            return res.status(400).json({ message: "No actionable fines found for your role." });
        }

        // 4. Post-Loop Actions (Emails & Main Status)

        // A. Check for "Pending Authorization" transition
        const allProcessed = fine.assignedEmployees.every(e => e.approvalStatus !== 'Pending');
        const allApprovedByManagers = fine.assignedEmployees.every(e => e.approvalStatus === 'Approved');
        const hasAuthorizationNeeded = fine.assignedEmployees.some(e => e.approvalStatus === 'Pending Authorization');

        // B. Update Main Status
        if (allApprovedByManagers) {
            fine.fineStatus = 'Approved';
            fine.approvedBy = req.user._id;
            fine.approvedDate = new Date();

            // Send Confirmation Email to Employees
            try {
                if (fine.attachment && fine.attachment.url) {
                    if (!isValidStorageUrl(fine.attachment.url)) {
                        console.warn('Skipping email due to invalid attachment URL hostname');
                        // Continue without email to prevent SSRF
                    } else {
                        await sendFineConfirmedEmail(fine, fine.assignedEmployees);
                    }
                } else {
                    await sendFineConfirmedEmail(fine, fine.assignedEmployees);
                }
            } catch (emailErr) {
                console.error("Failed to trigger confirmation email:", emailErr);
            }
        } else if (allProcessed && hasAuthorizationNeeded) {
            // All managers have acted, and at least one requires CEO authorization
            const wasAlreadyAuthorized = fine.fineStatus === 'Pending Authorization';
            fine.fineStatus = 'Pending Authorization';

            // C. Notify CEO ONLY if it just transitioned to Pending Authorization OR if forcefully needed
            // To avoid spamming, we could check if status changed, but here we'll ensure it triggers.
            if (!wasAlreadyAuthorized) {
                const hod = await getManagementHOD();
                if (hod) {
                    console.log('[ApproveFine] Transitioning to Pending Authorization. Notifying CEO...');
                    await sendHODAuthorizationEmail('Fine', fine, hod, {
                        name: `${managerBasic.firstName || 'Manager'} ${managerBasic.lastName || ''}`.trim(),
                        designation: managerBasic.designation
                    });
                }
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

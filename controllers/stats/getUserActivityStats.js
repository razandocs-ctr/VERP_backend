import Loan from "../../models/Loan.js";
import Reward from "../../models/Reward.js";
import Fine from "../../models/Fine.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import User from "../../models/User.js";

// ... imports ...

/**
 * Get Activity Stats for the Logged-in User (or a specific target user in their team)
 * aggregates data from Loans, Rewards, Fines, Profile Approvals, and Notices
 */
export const getUserActivityStats = async (req, res) => {
    try {
        const currentUser = req.user;
        if (!currentUser) return res.status(401).json({ message: "Unauthorized" });

        let targetEmployeeId = currentUser.employeeId;
        let targetEmail = currentUser.companyEmail;

        // If a target user ID is provided (viewing as someone else)
        if (req.query.targetUserId) {
            // Security Check: In a real app, verify targetUserId is in currentUser's hierarchy.
            // For this MVP, we rely on the fact that only employees can log in, and general visibility rules apply.
            // We first find the target employee to get their ID/Email
            const targetEmp = await EmployeeBasic.findById(req.query.targetUserId);
            if (targetEmp) {
                targetEmployeeId = targetEmp.employeeId;
                targetEmail = targetEmp.companyEmail;
            }
        }

        // 1. Get Manager's Employee Record (Target User)
        const manager = await EmployeeBasic.findOne({
            $or: [{ employeeId: targetEmployeeId }, { companyEmail: targetEmail }]
        });

        if (!manager) {
            // ... (rest of logic)
            // If they are Admin but not in EmployeeBasic, they might want to see EVERYTHING or nothing.
            // For now, let's treat non-employee users as having no management tasks.
            return res.status(200).json({ pending: 0, approved: 0, rejected: 0, total: 0, items: [] });
        }

        const isCEO = manager.department?.toLowerCase() === 'management' &&
            ['ceo', 'c.e.o', 'c.e.o.', 'director', 'managing director', 'general manager'].includes(manager.designation?.toLowerCase());

        // 2. Find Reportees
        const reportees = await EmployeeBasic.find({ primaryReportee: manager._id });
        const reporteeCustomIds = reportees.map(r => r.employeeId);
        const reporteeObjectIds = reportees.map(r => r._id);

        // 3. Define Queries for "Needs Action"
        const queries = [
            // Pending Profiles (Direct Manager)
            EmployeeBasic.find({ primaryReportee: manager._id, profileApprovalStatus: 'submitted' }),
            // Pending Notices (Direct Manager)
            EmployeeBasic.find({ primaryReportee: manager._id, 'noticeRequest.status': 'Pending' }),
            // Pending Loans (Direct Manager)
            Loan.find({ employeeObjectId: { $in: reporteeObjectIds }, status: 'Pending' }).populate('employeeObjectId', 'firstName lastName'),
            // Pending Rewards (Direct Manager)
            Reward.find({ employeeId: { $in: reporteeCustomIds }, rewardStatus: 'Pending' }),
            // Pending Fines (Direct Manager)
            Fine.find({ 'assignedEmployees': { $elemMatch: { employeeId: { $in: reporteeCustomIds }, approvalStatus: 'Pending' } } })
        ];

        // 4. CEO Queries (Authorization Stage)
        if (isCEO) {
            queries.push(
                Loan.find({ status: 'Pending Authorization' }).populate('employeeObjectId', 'firstName lastName'),
                Reward.find({ rewardStatus: 'Pending Authorization' }),
                Fine.find({ fineStatus: 'Pending Authorization' })
            );
        }

        const results = await Promise.all(queries);

        const pendingProfiles = results[0];
        const pendingNotices = results[1];
        const pendingLoans = results[2];
        const pendingRewards = results[3];
        const pendingFines = results[4];

        let authorizerTasks = [];
        if (isCEO) {
            authorizerTasks = [...results[5], ...results[6], ...results[7]];
        }

        // 5. Build Unified Activity List for "Pending"
        const activityList = [];

        pendingProfiles.forEach(p => activityList.push({
            id: p._id, type: 'Profile Activation', requestedBy: `${p.firstName} ${p.lastName}`,
            requestedDate: p.createdAt || p.updatedAt, actionedDate: null,
            status: 'Pending', extra1: p.employeeId, extra2: p.designation,
            targetEmployeeId: p.employeeId
        }));

        pendingNotices.forEach(p => activityList.push({
            id: p._id, type: 'Notice Request', requestedBy: `${p.firstName} ${p.lastName}`,
            requestedDate: p.noticeRequest.requestedAt, actionedDate: null,
            status: 'Pending', extra1: p.noticeRequest.reason, extra2: p.noticeRequest.duration,
            targetEmployeeId: p.employeeId
        }));

        pendingLoans.forEach(l => {
            const empName = l.employeeObjectId ? `${l.employeeObjectId.firstName} ${l.employeeObjectId.lastName}` : 'Employee';
            activityList.push({
                id: l._id, type: l.type || 'Loan/Advance', requestedBy: empName,
                requestedDate: l.createdAt, actionedDate: null,
                status: 'Pending', extra1: `AED ${l.amount}`, extra2: `${l.duration} Months`,
                targetEmployeeId: l.employeeId
            });
        });

        pendingRewards.forEach(r => activityList.push({
            id: r._id, type: 'Reward', requestedBy: r.employeeName,
            requestedDate: r.createdAt, actionedDate: null,
            status: 'Pending', extra1: r.rewardType, extra2: `AED ${r.amount || 0}`,
            targetEmployeeId: r.employeeId
        }));

        pendingFines.forEach(f => {
            const reporteeEntry = f.assignedEmployees.find(e => reporteeCustomIds.includes(e.employeeId));
            activityList.push({
                id: f._id, type: 'Fine', requestedBy: reporteeEntry?.employeeName || 'Multiple',
                requestedDate: f.createdAt, actionedDate: null,
                status: 'Pending', extra1: f.category, extra2: `AED ${f.fineAmount}`,
                targetEmployeeId: reporteeEntry?.employeeId
            });
        });

        if (isCEO) {
            // Deduplicate if already in list? CEO usually sees Pending Auth items.
            authorizerTasks.forEach(task => {
                // Determine type based on model name or properties
                let type = 'Approval Task';
                let reqBy = 'System';
                let amt = '-';
                let date = task.createdAt;
                let tEmpId = task.employeeId; // Default

                if (task.fineId) {
                    type = 'Fine Authorization';
                    // For Fines, show the employee name(s) involved or "HR/Finance" if generic
                    // Check if assignedEmployees has names
                    if (task.assignedEmployees && task.assignedEmployees.length > 0) {
                        reqBy = task.assignedEmployees.map(e => e.employeeName).join(', ');
                        if (reqBy.length > 30) reqBy = reqBy.substring(0, 27) + '...';
                        // Use first emp ID target for Nav
                        tEmpId = task.assignedEmployees[0]?.employeeId;
                    } else {
                        reqBy = 'HR/Finance';
                    }
                    amt = `AED ${task.fineAmount}`;
                }
                else if (task.rewardId) {
                    type = 'Reward Authorization';
                    reqBy = task.employeeName;
                    amt = `AED ${task.amount || 0}`;
                    tEmpId = task.employeeId;
                }
                else if (task.amount && task.status) {
                    type = 'Loan Authorization';
                    // Use populated name if available
                    reqBy = task.employeeObjectId ? `${task.employeeObjectId.firstName} ${task.employeeObjectId.lastName}` : (task.employeeName || 'Employee');
                    amt = `AED ${task.amount}`;
                    tEmpId = task.employeeId;
                }

                activityList.push({
                    id: task._id, type, requestedBy: reqBy,
                    requestedDate: date, actionedDate: null,
                    status: 'Pending', extra1: 'Management Authorization', extra2: amt,
                    targetEmployeeId: tEmpId
                });
            });
        }

        // Fetch the User record for the manager/target (needed for Reward/Fine approval checks which link to User)
        const targetUser = await User.findOne({ employeeId: manager.employeeId });

        console.log("Stats Debug:", {
            mode: req.query.targetUserId ? "Manager View" : "Self View",
            currentUserId: currentUser._id,
            requestTargetId: req.query.targetUserId,
            managerId: manager._id,
            managerEmpId: manager.employeeId,
            targetUserFound: !!targetUser,
            targetUserId: targetUser?._id
        });

        // 6. Actioned History (Items this user approved/rejected)
        const myActionedLoans = await Loan.find({ approvedBy: manager._id }).sort({ updatedAt: -1 }).limit(10);

        let myActionedRewards = [];
        let myActionedFines = [];

        if (targetUser) {
            [myActionedRewards, myActionedFines] = await Promise.all([
                Reward.find({ approvedBy: targetUser._id }).sort({ updatedAt: -1 }).limit(10),
                Fine.find({ 'assignedEmployees.approvedBy': targetUser._id }).sort({ updatedAt: -1 }).limit(10)
            ]);
        }

        const myActionedNotices = await EmployeeBasic.find({ 'noticeRequest.actionedBy': manager._id }).sort({ 'noticeRequest.actionedAt': -1 }).limit(10);

        myActionedLoans.forEach(l => activityList.push({
            id: l._id, type: l.type, requestedBy: l.employeeName || 'Employee',
            requestedDate: l.createdAt,
            actionedDate: l.approvedDate || l.updatedAt,
            status: l.status === 'Rejected' ? 'Rejected' : 'Approved',
            extra1: l.status === 'Rejected' ? 'Actioned: Rejected' : 'Actioned: Approved',
            extra2: `AED ${l.amount}`,
            targetEmployeeId: l.employeeId
        }));

        myActionedRewards.forEach(r => activityList.push({
            id: r._id, type: 'Reward', requestedBy: r.employeeName,
            requestedDate: r.createdAt,
            actionedDate: r.approvedDate || r.updatedAt,
            status: r.rewardStatus === 'Rejected' ? 'Rejected' : 'Approved',
            extra1: r.rewardStatus === 'Rejected' ? 'Actioned: Rejected' : 'Actioned: Approved',
            extra2: `AED ${r.amount || 0}`,
            targetEmployeeId: r.employeeId
        }));

        myActionedNotices.forEach(p => activityList.push({
            id: p._id, type: 'Notice Request', requestedBy: `${p.firstName} ${p.lastName}`,
            requestedDate: p.noticeRequest.requestedAt,
            actionedDate: p.noticeRequest.actionedAt || p.updatedAt,
            status: p.noticeRequest.status,
            extra1: `Actioned: ${p.noticeRequest.status}`,
            extra2: p.noticeRequest.reason,
            targetEmployeeId: p.employeeId
        }));

        myActionedFines.forEach(f => {
            // Fix: Use targetUser._id (the person whose stats we are building) to find their approval entry
            // If targetUser is null, myActionedFines would be empty, so targetUser is safe to access here or safely optional
            const approverIdToCheck = targetUser ? targetUser._id : currentUser._id;
            const myEntry = f.assignedEmployees.find(e => e.approvedBy?.toString() === approverIdToCheck.toString());
            activityList.push({
                id: f._id, type: 'Fine', requestedBy: myEntry?.employeeName || 'Employee',
                requestedDate: f.createdAt,
                actionedDate: myEntry?.approvedAt || f.updatedAt,
                status: myEntry?.approvalStatus === 'Rejected' ? 'Rejected' : 'Approved',
                extra1: `Actioned: ${myEntry?.approvalStatus}`,
                extra2: `AED ${f.fineAmount}`,
                targetEmployeeId: myEntry?.employeeId
            });
        });

        // Final counts
        const pendingCount = activityList.filter(i => i.status === 'Pending').length;
        const approvedCount = activityList.filter(i => i.status === 'Approved').length;
        const rejectedCount = activityList.filter(i => i.status === 'Rejected').length;

        res.status(200).json({
            pending: pendingCount,
            approved: approvedCount,
            rejected: rejectedCount,
            total: activityList.length,
            items: activityList.sort((a, b) => new Date(b.requestedDate) - new Date(a.requestedDate))
        });

    } catch (error) {
        console.error("Management Activity Stats Error:", error);
        res.status(500).json({ message: "Failed to fetch dashboard activity" });
    }
};

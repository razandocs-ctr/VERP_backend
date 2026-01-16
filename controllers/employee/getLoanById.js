import Loan from "../../models/Loan.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";

export const getLoanById = async (req, res) => {
    try {
        const { id } = req.params;

        const loan = await Loan.findById(id)
            .populate({
                path: 'employeeObjectId',
                select: 'firstName lastName department designation primaryReportee employeeId',
                populate: {
                    path: 'primaryReportee',
                    select: 'firstName lastName companyEmail'
                }
            })
            .lean();

        if (!loan) {
            return res.status(404).json({ message: "Loan request not found" });
        }

        // Format response
        const employee = loan.employeeObjectId || {};
        const hod = employee.primaryReportee || {};

        const data = {
            id: loan._id,
            loanId: `LOAN-${loan._id.toString().slice(-6).toUpperCase()}`,
            applicantName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
            department: employee.department || 'N/A',
            designation: employee.designation || 'N/A',
            hodName: `${hod.firstName || ''} ${hod.lastName || ''}`.trim() || 'N/A',
            primaryReporteeEmail: hod.companyEmail || null,
            employeeId: employee.employeeId, // Crucial for Edit/Pre-fill
            employeeObjectId: employee._id, // Adding MongoID just in case
            amount: loan.amount,
            reason: loan.reason,
            duration: loan.duration,
            type: loan.type,
            appliedDate: loan.appliedDate,
            status: loan.status,
            approvalStatus: loan.approvalStatus
        };

        res.status(200).json(data);

    } catch (error) {
        console.error("Error fetching loan details:", error);
        res.status(500).json({ message: "Failed to fetch loan details" });
    }
};

import nodemailer from "nodemailer";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import { getCompleteEmployee } from "../../services/employeeService.js";

export const sendApprovalEmail = async (req, res) => {
    const { id } = req.params;

    try {
        // Get employeeId from employee record
        const employee = await getCompleteEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        if (!employee.reportingAuthority) {
            return res.status(400).json({ message: "Reporting authority is not assigned for this employee." });
        }

        // Get reporting authority details
        const reportingAuthority = await EmployeeBasic.findById(employee.reportingAuthority).select("firstName lastName email");
        
        if (!reportingAuthority) {
            return res.status(400).json({ message: "Reporting authority not found." });
        }

        const reporteeEmail = reportingAuthority.email;
        if (!reporteeEmail) {
            return res.status(400).json({ message: "Reporting authority email is missing." });
        }

        const gmailUser = process.env.GMAIL_USER?.trim();
        const gmailPass = process.env.GMAIL_PASS?.trim();

        if (!gmailUser || !gmailPass) {
            return res.status(500).json({ message: "Email credentials are not configured on the server." });
        }

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: gmailUser,
                pass: gmailPass
            }
        });

        const employeeName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";
        const reporteeName = `${reportingAuthority.firstName || ""} ${reportingAuthority.lastName || ""}`.trim();
        const subject = `Profile activation request: ${employeeName}`;

        const html = `
            <p>Hello ${reporteeName || "Team"},</p>
            <p>The following employee has completed their profile and requested activation:</p>
            <ul>
                <li><strong>Name:</strong> ${employeeName}</li>
                <li><strong>Employee ID:</strong> ${employee.employeeId || "N/A"}</li>
                <li><strong>Department:</strong> ${employee.department || "N/A"}</li>
            </ul>
            <p>Please log into the ERP portal to review the profile and click the <strong>Activate Profile</strong> button.</p>
            <p>Thank you,<br/>ERP Portal</p>
        `;

        await transporter.sendMail({
            from: gmailUser,
            to: reporteeEmail,
            subject,
            html
        });

        const employeeId = employee.employeeId;
        const basicRecord = await EmployeeBasic.findOne({ employeeId });
        if (basicRecord && basicRecord.profileApprovalStatus !== "submitted") {
            basicRecord.profileApprovalStatus = "submitted";
            await basicRecord.save();
        }

        return res.status(200).json({ message: "Approval request sent successfully." });
    } catch (error) {
        console.error("Failed to send approval email:", error);
        return res.status(500).json({ message: error.message || "Failed to send approval email." });
    }
};



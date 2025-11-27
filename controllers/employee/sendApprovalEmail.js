import nodemailer from "nodemailer";
import Employee from "../../models/Employee.js";

export const sendApprovalEmail = async (req, res) => {
    const { id } = req.params;

    try {
        const employee = await Employee.findById(id).populate("reportingAuthority");

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        if (!employee.reportingAuthority) {
            return res.status(400).json({ message: "Reporting authority is not assigned for this employee." });
        }

        const reporteeEmail = employee.reportingAuthority.email || employee.reportingAuthority.workEmail;
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
        const reporteeName = `${employee.reportingAuthority.firstName || ""} ${employee.reportingAuthority.lastName || ""}`.trim();
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

        if (employee.profileApprovalStatus !== "submitted") {
            employee.profileApprovalStatus = "submitted";
            await employee.save();
        }

        return res.status(200).json({ message: "Approval request sent successfully." });
    } catch (error) {
        console.error("Failed to send approval email:", error);
        return res.status(500).json({ message: error.message || "Failed to send approval email." });
    }
};



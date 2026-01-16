import nodemailer from "nodemailer";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import Loan from "../../models/Loan.js";
import { getCompleteEmployee } from "../../services/employeeService.js";

export const requestLoan = async (req, res) => {
    const { employeeId, type, amount, duration, reason, employeeObjectId } = req.body;

    try {
        // 1. Create Loan Record
        const newLoan = new Loan({
            employeeId, // String ID
            employeeObjectId, // MongoDB ObjectId
            type,
            amount,
            duration,
            reason
        });

        const savedLoan = await newLoan.save();

        // 2. Fetch Employee & Reportee Info for Email
        // Assuming employeeObjectId is passed or we look it up. 
        // Ideally receiving reportee email from frontend or looking it up again.
        // Let's look up to be safe and get fresh reportee info.

        const employeeBasic = await getCompleteEmployee(employeeObjectId);

        if (!employeeBasic) {
            // Loan saved but email failed context
            return res.status(201).json({ message: "Loan application submitted, but employee details not found for email notification.", loan: savedLoan });
        }

        const reportee = employeeBasic.primaryReportee;
        if (!reportee) {
            return res.status(201).json({ message: "Loan saved, but primary reportee not assigned for email notification.", loan: savedLoan });
        }

        const reporteeEmail = reportee.companyEmail || reportee.workEmail || reportee.email;
        if (!reporteeEmail) {
            return res.status(201).json({ message: "Loan saved, but reportee email is missing.", loan: savedLoan });
        }

        // 3. Send Email
        const emailUser = process.env.EMAIL_USER?.trim();
        const emailPass = process.env.EMAIL_PASS?.trim();

        if (emailUser && emailPass) {
            const transporter = nodemailer.createTransport({
                host: "smtp.office365.com",
                port: 587,
                secure: false,
                auth: { user: emailUser, pass: emailPass }
            });

            const employeeName = `${employeeBasic.firstName || ""} ${employeeBasic.lastName || ""}`.trim();
            const reporteeName = `${reportee.firstName || ""} ${reportee.lastName || ""}`.trim();
            const subject = `${type} Application: ${employeeName}`;

            // Dynamic URL
            const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
            const baseUrl = origin || process.env.FRONTEND_URL || "http://localhost:3000";
            const typeSlug = type ? type.replace(/\s+/g, '-') : 'Loan';
            const actionUrl = `${baseUrl}/HRM/LoanAndAdvance/${typeSlug}-${savedLoan._id}`; // type-id slug

            const html = `
                <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                    <div style="background-color: #0d9488; color: white; padding: 20px; text-align: center;">
                        <h2 style="margin: 0;">${type} Application Review</h2>
                    </div>
                    <div style="padding: 30px;">
                        <p>Hello <strong>${reporteeName}</strong>,</p>
                        <p><strong>${employeeName}</strong> has submitted a request for ${type}.</p>
                        
                        <div style="background-color: #f0fdfa; padding: 20px; border-radius: 8px; border: 1px solid #ccfbf1; margin: 25px 0;">
                            <p style="margin: 0;"><strong>Employee:</strong> ${employeeName} (${employeeId})</p>
                            <p style="margin: 8px 0 0 0;"><strong>Type:</strong> ${type}</p>
                            <p style="margin: 8px 0 0 0;"><strong>Amount:</strong> ${Number(amount).toLocaleString()}</p>
                            <p style="margin: 8px 0 0 0;"><strong>Duration:</strong> ${duration} Months</p>
                             <p style="margin: 8px 0 0 0;"><strong>Reason:</strong> ${reason}</p>
                        </div>
                        
                        <p style="text-align: center; margin: 35px 0;">
                            <a href="${actionUrl}" style="background-color: #0d9488; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 16px;">View Request</a>
                        </p>
                    </div>
                </div>
            `;

            await transporter.sendMail({
                from: `"VeRP Portal" <${emailUser}>`,
                to: reporteeEmail,
                subject,
                html
            });
            console.log(`[Loan] Email sent to ${reporteeEmail}`);
        }

        res.status(201).json({ message: `${type} application submitted successfully.`, loan: savedLoan });

    } catch (error) {
        console.error("Error requesting loan:", error);
        res.status(500).json({ message: "Failed to submit application." });
    }
};

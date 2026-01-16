import { generatePdf } from "../../utils/generatePdf.js";
import Loan from "../../models/Loan.js";
import User from "../../models/User.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import nodemailer from "nodemailer";
import { getManagementHOD } from "../../utils/getManagementHOD.js";
import { sendHODAuthorizationEmail } from "../../utils/sendHODAuthorizationEmail.js";

export const approveLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Approved or Rejected only (PDF generated server-side)

        if (!status || !['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const loan = await Loan.findById(id);
        if (!loan) {
            return res.status(404).json({ message: "Loan not found" });
        }

        const requestingUserId = req.user?.id;
        if (!requestingUserId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Identify Approver
        let approverBasic = null;
        let approverDetails = null;

        const userObj = await User.findById(requestingUserId);
        const isAdmin = userObj?.isAdmin || userObj?.role === 'Admin' || userObj?.role === 'SuperAdmin';

        if (isAdmin) {
            approverDetails = { name: 'Admin', designation: 'Administrator', isAdmin: true };
        } else {
            // Find Employee
            approverBasic = await EmployeeBasic.findOne({
                $or: [{ _id: requestingUserId }, { employeeId: userObj?.employeeId }]
            });

            if (!approverBasic && userObj?.employeeId) {
                approverBasic = await EmployeeBasic.findOne({ employeeId: userObj.employeeId });
            }
        }

        if (approverBasic) {
            approverDetails = {
                name: `${approverBasic.firstName} ${approverBasic.lastName}`,
                designation: approverBasic.designation,
                department: approverBasic.department,
                email: approverBasic.companyEmail,
                id: approverBasic._id
            };
        }

        // Determine Status
        let finalStatus = status;

        if (status === 'Approved') {
            if (isAdmin) {
                finalStatus = 'Approved';
            } else if (approverBasic) {
                // Check CEO Validity (Strict)
                const isCEO = approverBasic.department && approverBasic.department.toLowerCase() === 'management' &&
                    ['ceo', 'c.e.o', 'c.e.o.', 'director', 'managing director', 'general manager'].includes(approverBasic.designation?.toLowerCase());

                // Check Reportee Status (of the loan applicant)
                const applicant = await EmployeeBasic.findOne({ employeeId: loan.employeeId }).populate('primaryReportee');
                let isReporteeManager = false;

                if (applicant && applicant.primaryReportee) {
                    const pRep = applicant.primaryReportee;
                    const pRepId = pRep._id ? pRep._id.toString() : pRep.toString();
                    if (pRepId === approverBasic._id.toString()) {
                        isReporteeManager = true;
                    }
                }

                // LOGIC: Strict 2-Stage Flow
                if (isCEO) {
                    finalStatus = 'Approved';
                } else if (isReporteeManager) {
                    finalStatus = 'Pending Authorization';
                } else {
                    finalStatus = 'Pending Authorization';
                }
            }
        }

        // Update Loan
        loan.status = finalStatus;
        loan.approvalStatus = finalStatus;
        // Set actioner details for both Approved and Rejected
        if (finalStatus === 'Approved' || finalStatus === 'Rejected') {
            loan.approvedBy = approverBasic ? approverBasic._id : requestingUserId;
            loan.approvedDate = new Date();
        }

        await loan.save();

        // Emails
        if (finalStatus === 'Pending Authorization') {
            const managementHod = await getManagementHOD();

            if (managementHod && managementHod.companyEmail) {
                const emailUser = process.env.EMAIL_USER;
                const emailPass = process.env.EMAIL_PASS;

                if (emailUser && emailPass) {
                    try {
                        const transporter = nodemailer.createTransport({
                            host: "smtp.office365.com",
                            port: 587,
                            secure: false, // true for 465, false for other ports
                            auth: {
                                user: emailUser,
                                pass: emailPass,
                            },
                        });

                        const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
                        const baseUrl = origin || process.env.FRONTEND_URL || "http://localhost:3000";
                        const actionUrl = `${baseUrl}/HRM/LoanAndAdvance/${loan._id}`;

                        const mailOptions = {
                            from: `"VeRP Notification" <${emailUser}>`,
                            to: managementHod.companyEmail,
                            subject: "Loan Authorization Required",
                            html: `
                                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                                    <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
                                        <h2 style="margin: 0;">Loan Pending Authorization</h2>
                                    </div>
                                    <div style="padding: 30px;">
                                        <p>Dear ${managementHod.firstName},</p>
                                        <p>A loan application from <strong>${approverDetails?.name || 'an employee'}</strong> (Applicant ID: ${loan.employeeId}) has been approved by their reportee and requires your final authorization.</p>
                                        <p><strong>Amount:</strong> AED ${Number(loan.amount).toLocaleString()}</p>
                                        
                                        <div style="text-align: center; margin: 30px 0;">
                                            <a href="${actionUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Application</a>
                                        </div>
                                    </div>
                                </div>
                            `
                        };

                        await transporter.sendMail(mailOptions);
                        console.log(`Authorization email sent to CEO: ${managementHod.companyEmail}`);
                    } catch (emailError) {
                        console.error("Failed to send authorization email:", emailError);
                    }
                }
            } else {
                console.warn("Management HOD (CEO) not found or has no email.");
            }
        } else if (finalStatus === 'Approved') {
            try {
                const applicant = await EmployeeBasic.findOne({ employeeId: loan.employeeId }).select('companyEmail email firstName lastName');
                if (applicant) {
                    const empEmail = applicant.companyEmail || applicant.email;
                    if (empEmail) {
                        const emailUser = process.env.EMAIL_USER;
                        const emailPass = process.env.EMAIL_PASS;
                        if (emailUser && emailPass) {
                            const transporter = nodemailer.createTransport({
                                host: "smtp.office365.com",
                                port: 587,
                                secure: false,
                                auth: { user: emailUser, pass: emailPass }
                            });

                            const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
                            const baseUrl = origin || process.env.FRONTEND_URL || "http://localhost:3000";
                            const actionUrl = `${baseUrl}/HRM/LoanAndAdvance/${loan._id}`;

                            const mailOptions = {
                                from: `"VeRP Notification" <${emailUser}>`,
                                to: empEmail,
                                subject: "Loan Application Approved",
                                html: `
                                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                                        <div style="background-color: #22c55e; color: white; padding: 20px; text-align: center;">
                                            <h2 style="margin: 0;">Loan Approved</h2>
                                        </div>
                                        <div style="padding: 30px;">
                                            <p>Dear ${applicant.firstName},</p>
                                            <p>Your loan application for <strong>AED ${Number(loan.amount).toLocaleString()}</strong> has been approved. Please find the approved loan document attached.</p>
                                        </div>
                                    </div>
                                `
                            };

                            // Generate PDF Server-Side
                            try {
                                const origin = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
                                const baseUrl = origin || process.env.FRONTEND_URL || "http://localhost:3000";
                                const loanUrl = `${baseUrl}/HRM/LoanAndAdvance/${loan._id}`;
                                const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

                                // We need to pass the user context. For simplicity, we can pass what we have, 
                                // but ideally the page fetches its own data. We just need a valid token.
                                // If the page relies on 'user' in localStorage, we should construct a minimal one.
                                const userPayload = {
                                    id: requestingUserId,
                                    isAdmin: isAdmin,
                                    role: userObj.role,
                                    employeeId: userObj.employeeId
                                };

                                // Inject permission to view the loan module
                                const permissions = {
                                    hrm_loan: { isView: true, isActive: true }
                                };

                                const pdfBuffer = await generatePdf(loanUrl, token, userPayload, permissions);

                                mailOptions.attachments = [{
                                    filename: `Loan_Application_${loan.loanId || loan._id}.pdf`,
                                    content: pdfBuffer,
                                    contentType: 'application/pdf'
                                }];
                            } catch (error) {
                                console.error("Failed to generate PDF attachment:", error);
                                // Continue sending email without attachment? or fail?
                                // Let's log and continue, maybe append a note in email?
                            }

                            await transporter.sendMail(mailOptions);
                        }
                    }
                }
            } catch (e) {
                console.error("Email error:", e);
            }
        }

        res.status(200).json({ message: `Loan ${finalStatus === 'Pending Authorization' ? 'submitted for authorization' : status.toLowerCase()}`, loan });

    } catch (error) {
        console.error("Error approving loan:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

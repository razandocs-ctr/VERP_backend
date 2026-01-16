import Reward from "../../models/Reward.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import User from "../../models/User.js";
import nodemailer from "nodemailer";
import { getManagementHOD } from "../../utils/getManagementHOD.js";
import { sendHODAuthorizationEmail } from "../../utils/sendHODAuthorizationEmail.js";

export const updateReward = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            employeeId,
            rewardType,
            rewardStatus,
            amount,
            description,
            awardedDate,
            remarks,
            title,
            employeeName,
            certHeader,
            certSubHeader,
            certPresentationText,
            certSigner1Name,
            certSigner1Title,
            certSigner2Name,
            certSigner2Title
        } = req.body;

        const reward = await Reward.findById(id);
        if (!reward) {
            return res.status(404).json({ message: "Reward not found" });
        }

        // If employeeId is being updated, verify employee exists and update name
        if (employeeId && employeeId !== reward.employeeId) {
            const employee = await EmployeeBasic.findOne({ employeeId }).select('firstName lastName employeeId').lean();
            if (!employee) {
                return res.status(404).json({ message: "Employee not found" });
            }
            reward.employeeId = employeeId;
            reward.employeeName = `${employee.firstName} ${employee.lastName}`;
        }

        // Update fields
        if (rewardType) reward.rewardType = rewardType;
        if (rewardType) reward.rewardType = rewardType;
        if (rewardStatus !== undefined) {
            // === NEW APPROVAL LOGIC ===
            let finalStatus = rewardStatus;
            let approverDetails = null;

            if (rewardStatus === 'Approved') {
                // Identify Approver
                let approverBasic = null;
                const approverUserId = req.user?.id;

                // Get Approver Employee Profile
                if (approverUserId) {
                    // Check if Admin
                    const userObj = await User.findById(approverUserId);
                    const isAdmin = userObj?.isAdmin || userObj?.role === 'Admin' || userObj?.role === 'SuperAdmin';

                    if (isAdmin) {
                        approverDetails = { name: 'Admin', designation: 'Administrator', isAdmin: true };
                    } else {
                        // Find Employee
                        approverBasic = await EmployeeBasic.findOne({
                            $or: [{ _id: approverUserId }, { employeeId: userObj?.employeeId }] // Best effort match
                        });

                        if (!approverBasic && userObj?.employeeId) {
                            approverBasic = await EmployeeBasic.findOne({ employeeId: userObj.employeeId });
                        }
                    }
                }

                if (!approverDetails && approverBasic) {
                    approverDetails = {
                        name: `${approverBasic.firstName} ${approverBasic.lastName}`,
                        designation: approverBasic.designation,
                        department: approverBasic.department,
                        email: approverBasic.companyEmail,
                        id: approverBasic._id
                    };

                    // Check CEO Validity (Strict)
                    const isCEO = approverBasic.department && approverBasic.department.toLowerCase() === 'management' &&
                        ['ceo', 'c.e.o', 'c.e.o.', 'director', 'managing director', 'general manager'].includes(approverBasic.designation?.toLowerCase());


                    // Check Reportee Status (of the reward receiver)
                    const rewardReceiver = await EmployeeBasic.findOne({ employeeId: reward.employeeId }).populate('primaryReportee');
                    let isReporteeManager = false;
                    if (rewardReceiver && rewardReceiver.primaryReportee) {
                        const pRep = rewardReceiver.primaryReportee;
                        const pRepId = pRep._id ? pRep._id.toString() : pRep.toString();
                        if (pRepId === approverBasic._id.toString()) {
                            isReporteeManager = true;
                        }
                    }

                    // LOGIC: Strict 2-Stage Flow
                    if (isCEO) {
                        // Stage 2: CEO can approve "Pending Authorization" items
                        if (reward.rewardStatus === 'Pending Authorization') {
                            finalStatus = 'Approved';
                        } else if (reward.rewardStatus === 'Pending' && isReporteeManager) {
                            // CEO as Reportee -> Instant Approve
                            finalStatus = 'Approved';
                        }
                    } else if (isReporteeManager) {
                        // Stage 1: Reportee moves to Pending Authorization
                        if (reward.rewardStatus === 'Pending') {
                            finalStatus = 'Pending Authorization';
                        }
                    }
                }
            }

            // Update Status
            reward.rewardStatus = finalStatus;

            // Handle HOD Email if Pending Authorization (New State)
            if (finalStatus === 'Pending Authorization') {
                const hod = await getManagementHOD();
                if (hod && approverDetails) {
                    await sendHODAuthorizationEmail('Reward', reward, hod, approverDetails);
                }
            }

            // If status is being approved (Final), set approvedBy and approvedDate
            if (finalStatus === 'Approved' && !reward.approvedBy) {
                reward.approvedBy = req.user?.id || null;
                reward.approvedDate = new Date();

                // === EMAIL NOTIFICATION LOGIC (Existing for Employee) ===
                try {
                    // Send email to the *Employee* (receiver of reward)
                    const employeeForEmail = await EmployeeBasic.findOne({ employeeId: reward.employeeId })
                        .select('firstName lastName email companyEmail employeeId')
                        .lean();

                    if (employeeForEmail) {
                        const empEmail = employeeForEmail.companyEmail || employeeForEmail.email;
                        const empName = `${employeeForEmail.firstName} ${employeeForEmail.lastName}`.trim();

                        if (empEmail) {
                            const emailUser = process.env.EMAIL_USER || process.env.VERP_EMAIL || process.env.GMAIL_USER;
                            const emailPass = process.env.EMAIL_PASS || process.env.VERP_PASS || process.env.GMAIL_PASS;

                            if (emailUser && emailPass) {
                                let smtpHost = "smtp.office365.com";
                                let smtpPort = 587;
                                if (emailUser.includes('@gmail.com') || process.env.GMAIL_USER) {
                                    smtpHost = "smtp.gmail.com";
                                }

                                const transporter = nodemailer.createTransport({
                                    host: smtpHost,
                                    port: smtpPort,
                                    secure: false, // true for 465, false for other ports
                                    auth: { user: emailUser, pass: emailPass }
                                });

                                // Get Approver Name Dynamic Logic (Simplified as we have details)
                                let approverName = approverDetails ? approverDetails.name : "Admin";

                                const subject = "Congratulations! You have received a Reward";
                                const html = `
                                     <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                                         <h2 style="color: #1a2e35;">Congratulations, ${empName}!</h2>
                                         <p>We are pleased to inform you that your <strong>${reward.rewardType}</strong> reward has been approved.</p>
                                         <p>This reward was approved by <strong>${approverName}</strong>.</p>
                                         <p>Please find your certificate attached to this email.</p>
                                         <br>
                                         <p>Best Regards,</p>
                                         <p>HR Team</p>
                                     </div>
                                 `;

                                const mailOptions = {
                                    from: `"VeRP Notification" <${emailUser}>`,
                                    to: empEmail,
                                    subject: subject,
                                    html: html,
                                    attachments: []
                                };

                                // Add PDF Attachment if exists
                                if (req.body.certificatePdf) {
                                    mailOptions.attachments.push({
                                        filename: `Certificate-${reward.employeeId}.pdf`,
                                        content: req.body.certificatePdf,
                                        encoding: 'base64'
                                    });
                                }

                                await transporter.sendMail(mailOptions);
                                console.log(`Reward approval email sent to ${empEmail}`);
                            }
                        }
                    }
                } catch (emailError) {
                    console.error("Failed to send reward approval email:", emailError);
                }
            } else if (rewardStatus === 'Rejected') {
                // === REJECTION EMAIL LOGIC ===
                try {
                    const employeeForEmail = await EmployeeBasic.findOne({ employeeId: reward.employeeId })
                        .select('firstName lastName email companyEmail')
                        .lean();

                    if (employeeForEmail) {
                        const empEmail = employeeForEmail.companyEmail || employeeForEmail.email;
                        const empName = `${employeeForEmail.firstName} ${employeeForEmail.lastName}`.trim();

                        if (empEmail) {
                            const emailUser = process.env.EMAIL_USER || process.env.VERP_EMAIL || process.env.GMAIL_USER;
                            const emailPass = process.env.EMAIL_PASS || process.env.VERP_PASS || process.env.GMAIL_PASS;

                            if (emailUser && emailPass) {
                                let smtpHost = "smtp.office365.com";
                                let smtpPort = 587;
                                if (emailUser.includes('@gmail.com') || process.env.GMAIL_USER) {
                                    smtpHost = "smtp.gmail.com";
                                }

                                const transporter = nodemailer.createTransport({
                                    host: smtpHost,
                                    port: smtpPort,
                                    secure: false,
                                    auth: { user: emailUser, pass: emailPass }
                                });

                                const subject = "Update regarding your Reward Request";
                                const html = `
                                     <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                                         <h2 style="color: #d32f2f;">Reward Request Update</h2>
                                         <p>Dear ${empName},</p>
                                         <p>We regret to inform you that your <strong>${reward.rewardType}</strong> reward request has been rejected.</p>
                                         ${remarks ? `<p><strong>Remarks:</strong> ${remarks}</p>` : ''}
                                         <br>
                                         <p>Best Regards,</p>
                                         <p>HR Team</p>
                                     </div>
                                 `;

                                await transporter.sendMail({
                                    from: `"VeRP Notification" <${emailUser}>`,
                                    to: empEmail,
                                    subject: subject,
                                    html: html
                                });
                                console.log(`Reward rejection email sent to ${empEmail}`);
                            }
                        }
                    }
                } catch (emailError) {
                    console.error("Failed to send reward rejection email:", emailError);
                }
            }
        }
        if (amount !== undefined) reward.amount = amount;
        if (description !== undefined) reward.description = description;
        if (awardedDate) reward.awardedDate = new Date(awardedDate);
        if (remarks !== undefined) reward.remarks = remarks;

        // Update certificate fields
        if (title !== undefined) reward.title = title;
        if (employeeName !== undefined) reward.employeeName = employeeName;
        if (certHeader !== undefined) reward.certHeader = certHeader;
        if (certSubHeader !== undefined) reward.certSubHeader = certSubHeader;
        if (certPresentationText !== undefined) reward.certPresentationText = certPresentationText;
        if (certSigner1Name !== undefined) reward.certSigner1Name = certSigner1Name;
        if (certSigner1Title !== undefined) reward.certSigner1Title = certSigner1Title;
        if (certSigner2Name !== undefined) reward.certSigner2Name = certSigner2Name;
        if (certSigner2Title !== undefined) reward.certSigner2Title = certSigner2Title;

        await reward.save();

        return res.status(200).json({
            message: "Reward updated successfully",
            reward
        });
    } catch (error) {
        console.error('Error updating reward:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: `Validation error: ${error.message}`
            });
        }

        return res.status(500).json({
            message: error.message || "Failed to update reward"
        });
    }
};













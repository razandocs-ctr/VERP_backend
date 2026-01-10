import Reward from "../../models/Reward.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import User from "../../models/User.js";
import nodemailer from "nodemailer";

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
            remarks
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
        if (rewardStatus !== undefined) {
            reward.rewardStatus = rewardStatus;

            // If status is being approved, set approvedBy and approvedDate
            // If status is being approved, set approvedBy and approvedDate
            if (rewardStatus === 'Approved' && !reward.approvedBy) {
                reward.approvedBy = req.user?.id || null;
                reward.approvedDate = new Date();

                // === EMAIL NOTIFICATION LOGIC ===
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
                                    secure: false,
                                    auth: { user: emailUser, pass: emailPass }
                                });

                                // Get Approver Name Dynamic Logic
                                let approverName = "Admin";
                                if (req.user && req.user.id) {
                                    try {
                                        // 1. Fetch User to check role
                                        const currentUser = await User.findById(req.user.id);

                                        if (currentUser) {
                                            // 2. If Admin => "Admin"
                                            if (currentUser.isAdmin) {
                                                approverName = "Admin";
                                            } else {
                                                // 3. If not Admin (e.g. Manager), try to find linked Employee
                                                // Try employeeId first, then fallback to same ID
                                                const searchId = currentUser.employeeId || req.user.id;
                                                const approverEmp = await EmployeeBasic.findById(searchId).select('firstName lastName').lean();

                                                if (approverEmp) {
                                                    approverName = `${approverEmp.firstName} ${approverEmp.lastName}`;
                                                }
                                            }
                                        } else {
                                            // Fallback: If User not found but req.user.id exists, try raw ID lookup
                                            const approverEmp = await EmployeeBasic.findById(req.user.id).select('firstName lastName').lean();
                                            if (approverEmp) approverName = `${approverEmp.firstName} ${approverEmp.lastName}`;
                                        }
                                    } catch (e) {
                                        console.error("Error fetching approver details:", e);
                                        // Keep default "Admin"
                                    }
                                }

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
            }
        }
        if (amount !== undefined) reward.amount = amount;
        if (description !== undefined) reward.description = description;
        if (awardedDate) reward.awardedDate = new Date(awardedDate);
        if (remarks !== undefined) reward.remarks = remarks;

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










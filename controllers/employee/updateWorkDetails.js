import EmployeeBasic from "../../models/EmployeeBasic.js";
import User from "../../models/User.js";
import bcrypt from "bcryptjs";
import { getCompleteEmployee } from "../../services/employeeService.js";

export const updateWorkDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Define allowed fields for work details
        const allowedFields = [
            "reportingAuthority",
            "overtime",
            "status",
            "probationPeriod",
            "designation",
            "department"
        ];

        // 2. Build updatePayload
        const updatePayload = {};

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updatePayload[field] = req.body[field];
            }
        });

        // 3. If nothing to update
        if (Object.keys(updatePayload).length === 0) {
            return res.status(400).json({ message: "Nothing to update" });
        }

        // Get employeeId from employee record
        const employee = await getCompleteEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const employeeId = employee.employeeId;

        // 4. Handle probation period logic
        if (updatePayload.status && updatePayload.status !== 'Probation') {
            updatePayload.probationPeriod = null;
        } else if (updatePayload.status === 'Probation' || (!updatePayload.status && employee.status === 'Probation')) {
            // If status is Probation (or already Probation), handle probation period
            const basicRecord = await EmployeeBasic.findOne({ employeeId });

            // Set default to 6 months if not provided and not already set
            if (!updatePayload.probationPeriod) {
                if (basicRecord && basicRecord.probationPeriod) {
                    updatePayload.probationPeriod = basicRecord.probationPeriod;
                } else {
                    // Default to 6 months if not set
                    updatePayload.probationPeriod = 6;
                }
            }

            // Check if probation period has ended and auto-change to Permanent
            if (employee.dateOfJoining && updatePayload.probationPeriod) {
                const joiningDate = new Date(employee.dateOfJoining);
                const probationEndDate = new Date(joiningDate);
                probationEndDate.setMonth(probationEndDate.getMonth() + updatePayload.probationPeriod);

                const today = new Date();
                today.setHours(0, 0, 0, 0);
                probationEndDate.setHours(0, 0, 0, 0);

                // If probation period has ended, automatically change to Permanent
                if (probationEndDate <= today) {
                    updatePayload.status = 'Permanent';
                    updatePayload.probationPeriod = null;
                }
            }
        }

        // 5. Update EmployeeBasic
        const updated = await EmployeeBasic.findOneAndUpdate(
            { employeeId },
            { $set: updatePayload },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updated) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Get updated employee data
        const completeEmployee = await getCompleteEmployee(employeeId);
        delete completeEmployee.password;

        // 6. Check if designation is "admin manager" and department is "administrator"
        // If so, automatically create a user with full permissions
        // Use updated values from completeEmployee (which has the latest data after update)
        const finalDesignation = completeEmployee.designation;
        const finalDepartment = completeEmployee.department;

        console.log('Checking user creation conditions:', {
            employeeId,
            designation: finalDesignation,
            department: finalDepartment,
            email: completeEmployee.email,
            designationMatch: finalDesignation?.toLowerCase() === 'admin manager',
            departmentMatch: finalDepartment?.toLowerCase() === 'administrator'
        });

        if (finalDesignation && finalDesignation.toLowerCase() === 'admin manager' &&
            finalDepartment && (finalDepartment.toLowerCase() === 'administrator' || finalDepartment.toLowerCase() === 'administration') &&
            completeEmployee.email) {
            try {
                // Check if user already exists for this employee
                const existingUser = await User.findOne({
                    $or: [
                        { employeeId },
                        { email: completeEmployee.email.toLowerCase().trim() }
                    ]
                });

                if (!existingUser) {
                    console.log(`Creating user for admin manager: ${employeeId}`);
                    // Generate username from first name
                    const firstName = completeEmployee.firstName || '';
                    let username = firstName.toLowerCase().trim() || employeeId.toLowerCase();

                    // Remove spaces and special characters from username
                    username = username.replace(/[^a-z0-9]/g, '');

                    // Check if username already exists, if so append employeeId
                    let finalUsername = username;
                    let usernameExists = await User.findOne({ username: finalUsername });
                    let counter = 1;
                    while (usernameExists) {
                        finalUsername = `${username}${counter}`;
                        usernameExists = await User.findOne({ username: finalUsername });
                        counter++;
                    }

                    // Generate a default password (can be changed later)
                    // Format: admin@123
                    const defaultPassword = 'admin@123';

                    // Hash password
                    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

                    // Calculate password expiry date (180 days from now)
                    const passwordExpiryDate = new Date();
                    passwordExpiryDate.setDate(passwordExpiryDate.getDate() + 180);

                    // Create user for admin manager in administrator department
                    const newUser = new User({
                        username: finalUsername,
                        name: `${completeEmployee.firstName} ${completeEmployee.lastName}`.trim(),
                        email: completeEmployee.email.toLowerCase().trim(),
                        password: hashedPassword,
                        employeeId: employeeId,
                        group: null, // Administrators don't need groups, they get full permissions
                        groupName: null,
                        status: 'Active',
                        enablePortalAccess: true,
                        isAdmin: true, // Mark as admin to get all permissions
                        passwordExpiryDate: passwordExpiryDate,
                    });

                    await newUser.save();
                    console.log(`✅ User created successfully for admin manager employee: ${employeeId} with username: ${finalUsername}`);
                } else {
                    console.log(`User already exists for employee: ${employeeId}`);
                }
            } catch (userError) {
                // Log error but don't fail the work details update
                console.error('❌ Error creating user for admin manager:', userError);
                console.error('Error details:', {
                    message: userError.message,
                    stack: userError.stack,
                    code: userError.code
                });
                // Continue with work details update even if user creation fails
            }
        } else {
            console.log('User creation conditions not met:', {
                hasDesignation: !!finalDesignation,
                hasDepartment: !!finalDepartment,
                hasEmail: !!completeEmployee.email,
                designationValue: finalDesignation,
                departmentValue: finalDepartment
            });
        }

        // 7. Return success
        return res.status(200).json({
            message: "Work details updated",
            employee: completeEmployee
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};














import Employee from "../../models/Employee.js";
import bcrypt from "bcryptjs";

// Calculate age from date of birth
const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// Add new employee
export const addEmployee = async (req, res) => {
    try {
        const {
            // Basic Info
            firstName,
            lastName,
            employeeId,
            role,
            department,
            designation,
            status,
            probationPeriod,
            reportingAuthority,
            profileApprovalStatus,
            profileStatus,

            // Login & Access
            email,
            enablePortalAccess,

            // Employment Info
            dateOfJoining,

            // Contact Info
            contactNumber,
            addressLine1,
            addressLine2,
            country,
            state,
            city,
            postalCode,

            // Personal Details
            gender,
            dateOfBirth,
            nationality,
            fathersName,

            // Document Expiry Details
            passportExp,
            eidExp,
            medExp,

            // Salary Structure
            monthlySalary,
            basic,
            basicPercentage,
            houseRentAllowance,
            houseRentPercentage,
            otherAllowance,
            otherAllowancePercentage,
            additionalAllowances,
        } = req.body;

        // Validate required fields
        // Check for empty strings, null, undefined, or whitespace-only strings
        const isEmpty = (val) => !val || (typeof val === 'string' && val.trim() === '');
        // Only keep the minimal must-have fields to align with the simplified form
        if (isEmpty(firstName) || isEmpty(lastName) || isEmpty(employeeId)) {
            return res.status(400).json({
                message: "Please fill all required fields (Basic Details)",
                missingFields: {
                    firstName: isEmpty(firstName),
                    lastName: isEmpty(lastName),
                    employeeId: isEmpty(employeeId)
                },
                receivedData: {
                    firstName: firstName || '(empty)',
                    lastName: lastName || '(empty)',
                    employeeId: employeeId || '(empty)'
                }
            });
        }

        // Check if employee ID already exists
        const existingEmployeeId = await Employee.findOne({ employeeId });
        if (existingEmployeeId) {
            return res.status(400).json({ message: "Employee ID already exists" });
        }

        // Check if email already exists
        const existingEmail = await Employee.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Calculate age from date of birth
        const age = calculateAge(dateOfBirth);

        // Hash password if portal access is enabled
        let hashedPassword = null;
        if (enablePortalAccess) {
            const { password } = req.body;
            if (!password) {
                return res.status(400).json({
                    message: "Password is required when Portal Access is enabled"
                });
            }
            hashedPassword = await bcrypt.hash(password, 10);
        }

        // Use designation as role if role is not provided
        const employeeRole = role || designation || '';

        // Create new employee
        const newEmployee = new Employee({
            // Basic Info
            firstName,
            lastName,
            employeeId,
            role: employeeRole,
            department,
            designation,
            status: status || 'Active',
            probationPeriod: status === 'Probation' ? (probationPeriod || null) : null,
            reportingAuthority: reportingAuthority || null,
            profileApprovalStatus: profileApprovalStatus || 'draft',
            profileStatus: profileStatus || 'inactive',

            // Login & Access
            email,
            password: hashedPassword, // Only set if enablePortalAccess is true
            enablePortalAccess: enablePortalAccess || false,

            // Employment Info
            dateOfJoining,

            // Contact Info
            contactNumber,
            addressLine1: addressLine1 || '',
            addressLine2: addressLine2 || '',
            country: country || '',
            state: state || '',
            city: city || '',
            postalCode: postalCode || '',

            // Personal Details
            gender,
            dateOfBirth: dateOfBirth || null, // Date fields can be null if not provided
            age: age || null, // Auto-calculated from dateOfBirth
            nationality: nationality || '',
            fathersName: fathersName || '',

            // Document Expiry Details
            passportExp: passportExp || null, // Date fields can be null if not provided
            eidExp: eidExp || null, // Date fields can be null if not provided
            medExp: medExp || null, // Date fields can be null if not provided

            // Salary Structure
            monthlySalary: monthlySalary || 0,
            basic: basic || 0,
            basicPercentage: basicPercentage || 60,
            houseRentAllowance: houseRentAllowance || 0,
            houseRentPercentage: houseRentPercentage || 20,
            otherAllowance: otherAllowance || 0,
            otherAllowancePercentage: otherAllowancePercentage || 20,
            additionalAllowances: additionalAllowances || [],
        });

        const savedEmployee = await newEmployee.save();

        return res.status(201).json({
            message: "Employee added successfully",
            employee: savedEmployee,
        });
    } catch (error) {
        console.error('Error adding employee:', error);
        if (error.code === 11000) {
            // Duplicate key error
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                message: `${field} already exists`
            });
        }
        return res.status(500).json({
            message: error.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};


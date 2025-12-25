import EmployeeBasic from "../../models/EmployeeBasic.js";
import EmployeeVisa from "../../models/EmployeeVisa.js";
import mongoose from "mongoose";

// Get all employees (lightweight list response with optional pagination)
export const getEmployees = async (req, res) => {
    // Check database connection first
    if (mongoose.connection.readyState !== 1) {
        console.error('Database not connected. Connection state:', mongoose.connection.readyState);
        return res.status(503).json({ 
            message: 'Database not connected. Please check server logs and ensure MongoDB is running.' 
        });
    }

    // Set a timeout for the entire request
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            return res.status(504).json({ 
                message: 'Request timeout. Database query took too long.' 
            });
        }
    }, 25000); // 25 seconds timeout (less than axios 30s timeout)

    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 1000);
        const skip = (page - 1) * limit;

        // Basic query/filter hooks (can be expanded later without breaking clients)
        const filters = {};
        const { department, designation, status, profileStatus, search } = req.query;

        if (department) filters.department = department;
        if (designation) filters.designation = designation;
        if (status) filters.status = status;
        if (profileStatus) filters.profileStatus = profileStatus;
        if (search) {
            const regex = new RegExp(search, 'i');
            filters.$or = [
                { firstName: regex },
                { lastName: regex },
                { employeeId: regex },
                { email: regex },
            ];
        }

        // Add query timeout options
        const queryOptions = { maxTimeMS: 20000 }; // 20 seconds max query time

        // Optimize: Exclude large fields (documents, profilePicture base64) for list view
        // Use populate with options to handle invalid references gracefully
        const [employees, total] = await Promise.all([
            EmployeeBasic.find(filters, null, queryOptions)
                .select('-password -documents -trainingDetails -__v')
                .populate({
                    path: 'reportingAuthority',
                    select: 'firstName lastName employeeId',
                    options: { lean: true }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            EmployeeBasic.countDocuments(filters, queryOptions),
        ]);

        // Populate visa details for each employee (only if we have employees)
        // Optimize: Exclude document fields from visa data for list view
        let employeesWithVisas = employees;
        if (employees.length > 0) {
            const employeeIds = employees.map(emp => emp.employeeId);
            const visas = await EmployeeVisa.find(
                { employeeId: { $in: employeeIds } }, 
                null, 
                queryOptions
            )
            .select('employeeId visit.number visit.issueDate visit.expiryDate visit.sponsor employment.number employment.issueDate employment.expiryDate employment.sponsor spouse.number spouse.issueDate spouse.expiryDate spouse.sponsor')
            .lean();
            const visaMap = {};
            visas.forEach(visa => {
                // Only include visa metadata, exclude large document fields
                const visitVisa = visa.visit ? {
                    number: visa.visit.number,
                    issueDate: visa.visit.issueDate,
                    expiryDate: visa.visit.expiryDate,
                    sponsor: visa.visit.sponsor
                } : undefined;
                const employmentVisa = visa.employment ? {
                    number: visa.employment.number,
                    issueDate: visa.employment.issueDate,
                    expiryDate: visa.employment.expiryDate,
                    sponsor: visa.employment.sponsor
                } : undefined;
                const spouseVisa = visa.spouse ? {
                    number: visa.spouse.number,
                    issueDate: visa.spouse.issueDate,
                    expiryDate: visa.spouse.expiryDate,
                    sponsor: visa.spouse.sponsor
                } : undefined;
                
                visaMap[visa.employeeId] = {
                    ...(visitVisa && { visit: visitVisa }),
                    ...(employmentVisa && { employment: employmentVisa }),
                    ...(spouseVisa && { spouse: spouseVisa }),
                };
            });

            // Attach visa details to employees
            employeesWithVisas = employees.map(emp => ({
                ...emp,
                visaDetails: visaMap[emp.employeeId] || null,
            }));
        }

        clearTimeout(timeout);
        return res.status(200).json({
            message: "Employees fetched successfully",
            employees: employeesWithVisas,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / limit)),
            },
        });
    } catch (error) {
        clearTimeout(timeout);
        
        // Enhanced error logging
        console.error('Error in getEmployees:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            code: error.code,
            errno: error.errno
        });
        
        // Check if it's a timeout error
        if (error.name === 'MongoServerError' && error.message?.includes('operation exceeded time limit')) {
            return res.status(504).json({ 
                message: 'Database query timeout. Please try again or contact support.' 
            });
        }
        
        // Check if it's a database connection error
        if (error.name === 'MongoServerSelectionError' || error.message?.includes('connection')) {
            return res.status(503).json({ 
                message: 'Database connection error. Please check if MongoDB is running.' 
            });
        }
        
        // Check if it's a Mongoose error
        if (error.name === 'CastError' || error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: `Invalid data: ${error.message}` 
            });
        }
        
        return res.status(500).json({ 
            message: error.message || 'Failed to fetch employees',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};




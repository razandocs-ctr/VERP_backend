import EmployeeBasic from "../../models/EmployeeBasic.js";
import EmployeeVisa from "../../models/EmployeeVisa.js";

// Get all employees (lightweight list response with optional pagination)
export const getEmployees = async (req, res) => {
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

        const [employees, total] = await Promise.all([
            EmployeeBasic.find(filters)
                .select('-password')
                .populate('reportingAuthority', 'firstName lastName employeeId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            EmployeeBasic.countDocuments(filters),
        ]);

        // Populate visa details for each employee
        const employeeIds = employees.map(emp => emp.employeeId);
        const visas = await EmployeeVisa.find({ employeeId: { $in: employeeIds } }).lean();
        const visaMap = {};
        visas.forEach(visa => {
            visaMap[visa.employeeId] = {
                visit: visa.visit,
                employment: visa.employment,
                spouse: visa.spouse,
            };
        });

        // Attach visa details to employees
        const employeesWithVisas = employees.map(emp => ({
            ...emp,
            visaDetails: visaMap[emp.employeeId] || null,
        }));

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
        return res.status(500).json({ message: error.message });
    }
};




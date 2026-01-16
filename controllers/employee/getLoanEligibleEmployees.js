import EmployeeBasic from "../../models/EmployeeBasic.js";
import EmployeeSalary from "../../models/EmployeeSalary.js";
import EmployeeVisa from "../../models/EmployeeVisa.js";

export const getLoanEligibleEmployees = async (req, res) => {
    try {
        // Fetch all active employees with basic info
        const employees = await EmployeeBasic.find(
            { profileStatus: 'active' },
            'employeeId firstName lastName status'
        ).lean();

        if (!employees.length) {
            return res.status(200).json({ employees: [] });
        }

        const employeeIds = employees.map(e => e.employeeId);

        // Fetch Salaries
        const salaries = await EmployeeSalary.find(
            { employeeId: { $in: employeeIds } },
            'employeeId totalSalary monthlySalary'
        ).lean();

        // Fetch Visas (Employment, Spouse, Visit)
        const visas = await EmployeeVisa.find(
            { employeeId: { $in: employeeIds } },
            'employeeId employment.expiryDate spouse.expiryDate visit.expiryDate'
        ).lean();

        // Map data for quick lookup
        const salaryMap = salaries.reduce((acc, curr) => {
            acc[curr.employeeId] = curr.totalSalary || curr.monthlySalary || 0;
            return acc;
        }, {});

        const visaMap = visas.reduce((acc, curr) => {
            if (curr.employment?.expiryDate) {
                acc[curr.employeeId] = { type: 'Employment', expiry: curr.employment.expiryDate };
            } else if (curr.spouse?.expiryDate) {
                acc[curr.employeeId] = { type: 'Spouse', expiry: curr.spouse.expiryDate };
            } else if (curr.visit?.expiryDate) {
                acc[curr.employeeId] = { type: 'Visit', expiry: curr.visit.expiryDate };
            } else {
                acc[curr.employeeId] = { type: null, expiry: null };
            }
            return acc;
        }, {});

        // Merge data
        const eligibleEmployees = employees.map(emp => ({
            employeeId: emp.employeeId,
            employeeObjectId: emp._id,
            name: `${emp.firstName} ${emp.lastName}`,
            status: emp.status, // Probation, Permanent, Notice
            salary: salaryMap[emp.employeeId] || 0,
            visaExpiry: visaMap[emp.employeeId]?.expiry || null,
            visaType: visaMap[emp.employeeId]?.type || null,
        }));

        res.status(200).json({ employees: eligibleEmployees });

    } catch (error) {
        console.error("Error fetching loan eligible employees:", error);
        res.status(500).json({ message: "Failed to fetch employee eligibility data" });
    }
};

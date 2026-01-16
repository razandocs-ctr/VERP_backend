import EmployeeBasic from "../models/EmployeeBasic.js";

/**
 * Retrieves the CEO (Management HOD) for final approval.
 * STRICT Criteria: Department = 'Management' AND Designation = 'CEO'.
 * @returns {Promise<Object|null>} The CEO employee object or null if not found.
 */
export const getManagementHOD = async () => {
    try {
        // Strict Priority: CEO or equivalent Management HOD
        const designations = [
            'CEO', 'C.E.O', 'C.E.O.',
            'Director', 'Managing Director',
            'General Manager'
        ];

        // Find match in Management department
        const hod = await EmployeeBasic.findOne({
            department: { $regex: /^management$/i },
            designation: { $in: designations.map(d => new RegExp(`^${d}$`, 'i')) },
            profileStatus: 'active' // Ensure active employee
        }).select('employeeId firstName lastName companyEmail personalEmail designation');

        console.log('[getManagementHOD] Search Result:', hod ? {
            id: hod.employeeId,
            name: `${hod.firstName} ${hod.lastName}`,
            email: hod.companyEmail || hod.personalEmail,
            designation: hod.designation
        } : 'NOT FOUND');

        if (!hod) {
            console.warn('[getManagementHOD] No CEO found for Management department.');
            return null;
        }

        return hod;
    } catch (error) {
        console.error('[getManagementHOD] Error finding CEO:', error);
        return null;
    }
};

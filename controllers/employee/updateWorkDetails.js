import EmployeeBasic from "../../models/EmployeeBasic.js";
import { getCompleteEmployee } from "../../services/employeeService.js";

export const updateWorkDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Define allowed fields for work details
        const allowedFields = [
            "reportingAuthority",
            "primaryReportee",
            "secondaryReportee",
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
                // Handle null/empty strings for reportee fields
                if ((field === 'primaryReportee' || field === 'secondaryReportee' || field === 'reportingAuthority') && (req.body[field] === '' || req.body[field] === null)) {
                    updatePayload[field] = null;
                } else {
                    updatePayload[field] = req.body[field];
                }
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

        // 6. Return success
        return res.status(200).json({
            message: "Work details updated",
            employee: completeEmployee
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};














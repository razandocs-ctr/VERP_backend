import { getCompleteEmployee, saveEmployeeData } from "../../services/employeeService.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";

export const updateBasicDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // Get employeeId from the employee record
        const employee = await getCompleteEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const employeeId = employee.employeeId;

        // 1. Define allowed fields and their target collections
        const allowedFields = [
            "employeeId",
            "contactNumber",
            "email",
            "country",
            "nationality",
            "status",
            "probationPeriod",
            "reportingAuthority",
            "profileApprovalStatus",
            "profileStatus",
            "bankName",
            "accountName",
            "accountNumber",
            "ibanNumber",
            "swiftCode",
            "ifscCode",
            "bankOtherDetails",
            "addressLine1",
            "addressLine2",
            "city",
            "state",
            "postalCode",
            "currentAddressLine1",
            "currentAddressLine2",
            "currentCity",
            "currentState",
            "currentCountry",
            "currentPostalCode",
            "dateOfBirth",
            "maritalStatus",
            "fathersName",
            "gender",
            "emergencyContactName",
            "emergencyContactRelation",
            "emergencyContactNumber",
            "basic",
            "houseRentAllowance",
            "otherAllowance",
            "additionalAllowances",
            "salaryHistory",
            "profilePicture"
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

        // 4. Update using service (which handles routing to correct collections)
        const updated = await saveEmployeeData(employeeId, updatePayload);

        if (!updated) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Remove password from response
        delete updated.password;

        // 5. Return success
        return res.status(200).json({
            message: "Basic details updated",
            employee: updated
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};

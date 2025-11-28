import Employee from "../../models/Employee.js";

export const updateBasicDetails = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Define allowed fields
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
            "country",
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
            "salaryHistory"
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

        // 4. Update DB
        const updated = await Employee.findByIdAndUpdate(
            id,
            { $set: updatePayload },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updated) {
            return res.status(404).json({ message: "Employee not found" });
        }

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

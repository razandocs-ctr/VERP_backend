import Employee from "../../models/Employee.js";

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

        // 4. Clear probationPeriod if status is not Probation
        if (updatePayload.status && updatePayload.status !== 'Probation') {
            updatePayload.probationPeriod = null;
        } else if (updatePayload.status === 'Probation' && !updatePayload.probationPeriod) {
            // If status is Probation but probationPeriod is not provided, keep existing value
            const employee = await Employee.findById(id);
            if (employee && employee.probationPeriod) {
                updatePayload.probationPeriod = employee.probationPeriod;
            }
        }

        // 5. Update DB
        const updated = await Employee.findByIdAndUpdate(
            id,
            { $set: updatePayload },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updated) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // 6. Return success
        return res.status(200).json({
            message: "Work details updated",
            employee: updated
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};



import Employee from "../../models/Employee.js";

export const updateEmergencyContact = async (req, res) => {
    const { id, contactId } = req.params;
    const { name, relation = 'Self', number } = req.body;

    if (!name || !number) {
        return res.status(400).json({ message: "Name and number are required" });
    }

    const trimmedName = name.trim();
    const rawNumber = number.toString().trim();

    if (!trimmedName || !rawNumber) {
        return res.status(400).json({ message: "Name and number are required" });
    }

    const normalizedNumber = rawNumber.startsWith('+') ? rawNumber : `+${rawNumber}`;

    try {
        const employee = await Employee.findOneAndUpdate(
            { _id: id, "emergencyContacts._id": contactId },
            {
                $set: {
                    "emergencyContacts.$.name": trimmedName,
                    "emergencyContacts.$.relation": relation,
                    "emergencyContacts.$.number": normalizedNumber
                }
            },
            { new: true, runValidators: true }
        ).select("-password");

        if (!employee) {
            return res.status(404).json({ message: "Employee or contact not found" });
        }

        const primaryContact = employee.emergencyContacts?.[0];
        if (primaryContact) {
            employee.emergencyContactName = primaryContact.name || '';
            employee.emergencyContactRelation = primaryContact.relation || 'Self';
            employee.emergencyContactNumber = primaryContact.number || '';
        } else {
            employee.emergencyContactName = '';
            employee.emergencyContactRelation = '';
            employee.emergencyContactNumber = '';
        }

        await employee.save();

        return res.status(200).json({
            message: "Emergency contact updated",
            emergencyContacts: employee.emergencyContacts
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};



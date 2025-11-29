import Employee from "../../models/Employee.js";

export const addEmergencyContact = async (req, res) => {
    const { id } = req.params;
    const { name, relation = 'Self', number } = req.body;

    if (!name || !number) {
        return res.status(400).json({ message: "Name and number are required" });
    }

    const normalizedNumber = number.startsWith('+') ? number : `+${number}`;

    try {
        const updated = await Employee.findByIdAndUpdate(
            id,
            {
                $push: {
                    emergencyContacts: {
                        name,
                        relation,
                        number: normalizedNumber
                    }
                },
                $setOnInsert: {
                    emergencyContactName: name,
                    emergencyContactRelation: relation,
                    emergencyContactNumber: normalizedNumber
                }
            },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updated) {
            return res.status(404).json({ message: "Employee not found" });
        }

        return res.status(200).json({
            message: "Emergency contact added",
            emergencyContacts: updated.emergencyContacts
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};









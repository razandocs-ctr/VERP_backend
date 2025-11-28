import Employee from "../../models/Employee.js";

export const deleteEmergencyContact = async (req, res) => {
    const { id, contactId } = req.params;

    if (!contactId) {
        return res.status(400).json({ message: "Contact ID is required" });
    }

    try {
        const employee = await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const contact = employee.emergencyContacts.id(contactId);

        if (!contact) {
            return res.status(404).json({ message: "Emergency contact not found" });
        }

        contact.deleteOne();

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
            message: "Emergency contact deleted",
            emergencyContacts: employee.emergencyContacts
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};








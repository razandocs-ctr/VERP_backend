import Employee from "../../models/Employee.js";

export const deleteEducation = async (req, res) => {
    const { id, educationId } = req.params;

    if (!educationId) {
        return res.status(400).json({ message: "Education ID is required" });
    }

    try {
        const employee = await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const education = employee.educationDetails.id(educationId);

        if (!education) {
            return res.status(404).json({ message: "Education record not found" });
        }

        education.deleteOne();
        await employee.save();

        return res.status(200).json({
            message: "Education record deleted successfully",
            educationDetails: employee.educationDetails
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};






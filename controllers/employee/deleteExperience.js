import Employee from "../../models/Employee.js";

export const deleteExperience = async (req, res) => {
    const { id, experienceId } = req.params;

    if (!experienceId) {
        return res.status(400).json({ message: "Experience ID is required" });
    }

    try {
        const employee = await Employee.findById(id);

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const experience = employee.experienceDetails.id(experienceId);

        if (!experience) {
            return res.status(404).json({ message: "Experience record not found" });
        }

        experience.deleteOne();
        await employee.save();

        return res.status(200).json({
            message: "Experience record deleted successfully",
            experienceDetails: employee.experienceDetails
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};






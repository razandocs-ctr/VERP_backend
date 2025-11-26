import Employee from "../../models/Employee.js";

// Delete employee
export const deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedEmployee = await Employee.findByIdAndDelete(id);

        if (!deletedEmployee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        return res.status(200).json({
            message: "Employee deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};




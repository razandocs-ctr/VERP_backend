import Department from "../models/Department.js";

// Create a new department
export const createDepartment = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Department name is required" });
        }

        const existingDepartment = await Department.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingDepartment) {
            return res.status(400).json({ message: "Department already exists" });
        }

        const department = new Department({ name });
        await department.save();

        res.status(201).json(department);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all departments
export const getDepartments = async (req, res) => {
    try {
        // Ensure "Management" department exists and is protected
        await Department.findOneAndUpdate(
            { name: "Management" },
            { $set: { name: "Management", isSystem: true, status: "Active" } },
            { upsert: true, new: true }
        );

        const departments = await Department.find({ status: "Active" }).sort({ name: 1 });
        res.status(200).json(departments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a department
export const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const department = await Department.findById(id);

        if (!department) {
            return res.status(404).json({ message: "Department not found" });
        }

        if (department.isSystem) {
            return res.status(403).json({ message: "Cannot delete system default department" });
        }

        await Department.findByIdAndDelete(id);

        res.status(200).json({ message: "Department deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

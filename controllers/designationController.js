import Designation from "../models/Designation.js";
import { escapeRegex } from "../utils/regexHelper.js";

// Create a new designation
export const createDesignation = async (req, res) => {
    try {
        const { name, department } = req.body;

        if (!name || !department) {
            return res.status(400).json({ message: "Designation name and department are required" });
        }

        const existingDesignation = await Designation.findOne({
            name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
            department: { $regex: new RegExp(`^${escapeRegex(department)}$`, 'i') }
        });

        if (existingDesignation) {
            return res.status(400).json({ message: "Designation already exists in this department" });
        }

        const designation = new Designation({ name, department });
        await designation.save();

        res.status(201).json(designation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get all designations
export const getDesignations = async (req, res) => {
    try {
        const { department } = req.query;
        let query = { status: "Active" };

        if (department) {
            query.department = department;
        }

        const designations = await Designation.find(query).sort({ name: 1 });

        // Ensure "General Manager" exists and is protected if requesting "Management" (or general fetch)
        if (!department || department === "Management") {
            const gm = await Designation.findOneAndUpdate(
                { name: "General Manager", department: "Management" },
                { $set: { name: "General Manager", department: "Management", isSystem: true, status: "Active" } },
                { upsert: true, new: true }
            );

            // Check if gm is already in the list
            if (!designations.some(d => d._id.equals(gm._id))) {
                designations.push(gm);
            }
            // Re-sort
            designations.sort((a, b) => a.name.localeCompare(b.name));
        }

        res.status(200).json(designations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Delete a designation
export const deleteDesignation = async (req, res) => {
    try {
        const { id } = req.params;
        const designation = await Designation.findById(id);

        if (!designation) {
            return res.status(404).json({ message: "Designation not found" });
        }

        if (designation.isSystem) {
            return res.status(403).json({ message: "Cannot delete system default designation" });
        }

        await Designation.findByIdAndDelete(id);

        if (!designation) {
            return res.status(404).json({ message: "Designation not found" });
        }

        res.status(200).json({ message: "Designation deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

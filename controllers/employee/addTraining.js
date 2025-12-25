import EmployeeTraining from "../../models/EmployeeTraining.js";
import { getCompleteEmployee, resolveEmployeeId } from "../../services/employeeService.js";

export const addTraining = async (req, res) => {
    const { id } = req.params;
    const { trainingName, trainingDetails, trainingFrom, trainingDate, trainingCost, trainingCertificate } = req.body;

    // Validate required fields
    if (!trainingName || !trainingFrom || !trainingDate) {
        return res.status(400).json({
            message: "Training Name, Training From, and Training Date are required"
        });
    }

    // Validate date
    const parsedTrainingDate = new Date(trainingDate);
    if (isNaN(parsedTrainingDate.getTime())) {
        return res.status(400).json({ message: "Invalid training date provided" });
    }

    try {
        // Get employeeId from employee record using optimized resolver
        const employee = await resolveEmployeeId(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const employeeId = employee.employeeId;

        const trainingData = {
            trainingName: trainingName.trim(),
            trainingDetails: trainingDetails ? trainingDetails.trim() : undefined,
            trainingFrom: trainingFrom.trim(),
            trainingDate: parsedTrainingDate,
            trainingCost: trainingCost !== undefined && trainingCost !== null && trainingCost !== '' ? Number(trainingCost) : undefined,
            trainingCertificate: trainingCertificate && trainingCertificate.data ? {
                data: trainingCertificate.data,
                name: trainingCertificate.name || '',
                mimeType: trainingCertificate.mimeType || 'application/pdf'
            } : undefined
        };

        // Update or create training record
        const updated = await EmployeeTraining.findOneAndUpdate(
            { employeeId },
            {
                $push: {
                    trainingDetails: trainingData
                }
            },
            { upsert: true, new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Employee not found" });
        }

        return res.status(200).json({
            message: "Training details added successfully",
            trainingDetails: updated.trainingDetails
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};









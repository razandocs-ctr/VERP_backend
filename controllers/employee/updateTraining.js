import EmployeeTraining from "../../models/EmployeeTraining.js";
import { getCompleteEmployee } from "../../services/employeeService.js";

export const updateTraining = async (req, res) => {
    const { id, trainingId } = req.params;
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
        // Get employeeId from employee record
        const employee = await getCompleteEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const employeeId = employee.employeeId;

        const trainingRecord = await EmployeeTraining.findOne({ employeeId });

        if (!trainingRecord) {
            return res.status(404).json({ message: "Training record not found" });
        }

        const training = trainingRecord.trainingDetails.id(trainingId);

        if (!training) {
            return res.status(404).json({ message: "Training record not found" });
        }

        // Update training fields
        training.trainingName = trainingName.trim();
        training.trainingDetails = trainingDetails ? trainingDetails.trim() : undefined;
        training.trainingFrom = trainingFrom.trim();
        training.trainingDate = parsedTrainingDate;
        training.trainingCost = trainingCost !== undefined && trainingCost !== null && trainingCost !== '' ? Number(trainingCost) : undefined;

        // Update certificate if provided
        if (trainingCertificate && trainingCertificate.data) {
            training.trainingCertificate = {
                data: trainingCertificate.data,
                name: trainingCertificate.name || '',
                mimeType: trainingCertificate.mimeType || 'application/pdf'
            };
        } else if (trainingCertificate === null) {
            // Allow clearing the certificate
            training.trainingCertificate = undefined;
        }

        await trainingRecord.save();

        return res.status(200).json({
            message: "Training details updated successfully",
            trainingDetails: trainingRecord.trainingDetails
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};









import Employee from "../../models/Employee.js";

export const updateExperience = async (req, res) => {
    const { id, experienceId } = req.params;
    const { company, designation, startDate, endDate, certificate } = req.body;

    // Validate required fields
    if (!company || !designation || !startDate) {
        return res.status(400).json({ 
            message: "Company, Designation, and Start Date are required" 
        });
    }

    // Validate that end date is after start date if both are provided
    if (endDate && new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({ 
            message: "End Date must be after Start Date" 
        });
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

        // Update experience fields
        experience.company = company.trim();
        experience.designation = designation.trim();
        experience.startDate = new Date(startDate);
        experience.endDate = endDate ? new Date(endDate) : null;

        // Update certificate if provided
        if (certificate && certificate.data) {
            experience.certificate = {
                data: certificate.data,
                name: certificate.name || '',
                mimeType: certificate.mimeType || 'application/pdf'
            };
        } else if (certificate === null) {
            // Allow clearing the certificate
            experience.certificate = undefined;
        }

        await employee.save();

        return res.status(200).json({
            message: "Experience details updated successfully",
            experienceDetails: employee.experienceDetails
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};






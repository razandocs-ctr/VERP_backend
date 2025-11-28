import Employee from "../../models/Employee.js";

export const updateEducation = async (req, res) => {
    const { id, educationId } = req.params;
    const { universityOrBoard, collegeOrInstitute, course, fieldOfStudy, completedYear, certificate } = req.body;

    // Validate required fields
    if (!universityOrBoard || !collegeOrInstitute || !course || !fieldOfStudy || !completedYear) {
        return res.status(400).json({ 
            message: "University/Board, College/Institute, Course, Field of Study, and Completed Year are required" 
        });
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

        // Update education fields
        education.universityOrBoard = universityOrBoard.trim();
        education.collegeOrInstitute = collegeOrInstitute.trim();
        education.course = course.trim();
        education.fieldOfStudy = fieldOfStudy.trim();
        education.completedYear = completedYear.trim();

        // Update certificate if provided
        if (certificate && certificate.data) {
            education.certificate = {
                data: certificate.data,
                name: certificate.name || '',
                mimeType: certificate.mimeType || 'application/pdf'
            };
        } else if (certificate === null) {
            // Allow clearing the certificate
            education.certificate = undefined;
        }

        await employee.save();

        return res.status(200).json({
            message: "Education details updated successfully",
            educationDetails: employee.educationDetails
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};



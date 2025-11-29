import Employee from "../../models/Employee.js";

export const addEducation = async (req, res) => {
    const { id } = req.params;
    const { universityOrBoard, collegeOrInstitute, course, fieldOfStudy, completedYear, certificate } = req.body;

    // Validate required fields
    if (!universityOrBoard || !collegeOrInstitute || !course || !fieldOfStudy || !completedYear) {
        return res.status(400).json({ 
            message: "University/Board, College/Institute, Course, Field of Study, and Completed Year are required" 
        });
    }

    try {
        const educationData = {
            universityOrBoard: universityOrBoard.trim(),
            collegeOrInstitute: collegeOrInstitute.trim(),
            course: course.trim(),
            fieldOfStudy: fieldOfStudy.trim(),
            completedYear: completedYear.trim(),
            certificate: certificate && certificate.data ? {
                data: certificate.data,
                name: certificate.name || '',
                mimeType: certificate.mimeType || 'application/pdf'
            } : undefined
        };

        const updated = await Employee.findByIdAndUpdate(
            id,
            {
                $push: {
                    educationDetails: educationData
                }
            },
            { new: true, runValidators: true }
        ).select("-password");

        if (!updated) {
            return res.status(404).json({ message: "Employee not found" });
        }

        return res.status(200).json({
            message: "Education details added successfully",
            educationDetails: updated.educationDetails
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message });
    }
};




import Employee from "../../models/Employee.js";
import { uploadDocumentToS3 } from "../../utils/s3Upload.js";
import mongoose from "mongoose";

// @desc    Update a document in employee's documents list
// @route   PATCH /api/Employee/:id/document/:index
// @access  Private
export const updateDocument = async (req, res) => {
    try {
        const { id, index } = req.params;
        const { type, expiryDate, document } = req.body;

        let employee = await Employee.findOne({ employeeId: id });

        if (!employee && mongoose.Types.ObjectId.isValid(id)) {
            employee = await Employee.findById(id);
        }

        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const docIndex = parseInt(index);
        if (isNaN(docIndex) || docIndex < 0 || docIndex >= employee.documents.length) {
            return res.status(400).json({ message: "Invalid document index" });
        }

        // Update fields if provided
        if (type) employee.documents[docIndex].type = type;
        if (expiryDate !== undefined) employee.documents[docIndex].expiryDate = expiryDate;

        if (document) {
            let documentData = null;

            // Check if it's new base64 data needing upload
            if (document.data && typeof document.data === 'string') {
                const folderPath = `employee-documents/${employee.employeeId}`;
                const uploadResult = await uploadDocumentToS3(
                    document.data,
                    folderPath,
                    document.name
                );

                documentData = {
                    name: document.name,
                    url: uploadResult.url,
                    mimeType: document.mimeType || 'application/pdf',
                    publicId: uploadResult.publicId
                };
            } else if (document.url) {
                // Existing or link
                documentData = {
                    name: document.name,
                    url: document.url,
                    mimeType: document.mimeType,
                    publicId: document.publicId
                };
            }

            if (documentData) {
                employee.documents[docIndex].document = documentData;
            }
        }

        const updatedEmployee = await employee.save();

        res.status(200).json({
            message: "Document updated successfully",
            employee: updatedEmployee
        });

    } catch (error) {
        console.error("Error updating document:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

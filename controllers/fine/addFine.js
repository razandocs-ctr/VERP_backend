import Fine from "../../models/Fine.js";
import EmployeeBasic from "../../models/EmployeeBasic.js";
import { uploadDocumentToCloudinary } from "../../utils/cloudinaryUpload.js";

/**
 * Generate unique random fine ID (4 digits)
 */
const generateFineId = async () => {
    try {
        const generateRandomId = () => {
            return Math.floor(1000 + Math.random() * 9000).toString();
        };

        let newFineId = generateRandomId();
        let exists = await Fine.findOne({ fineId: newFineId }).lean();
        let attempts = 0;
        const maxAttempts = 100;

        while (exists && attempts < maxAttempts) {
            newFineId = generateRandomId();
            exists = await Fine.findOne({ fineId: newFineId }).lean();
            attempts++;
        }

        if (attempts >= maxAttempts || exists) {
            return Date.now().toString().slice(-4);
        }

        return newFineId;
    } catch (error) {
        console.error('Error generating fine ID:', error);
        return Date.now().toString().slice(-4);
    }
};

export const addFine = async (req, res) => {
    try {
        const {
            employeeId,
            fineType,
            fineStatus,
            fineAmount,
            description,
            awardedDate,
            remarks,
            attachment,
            category,
            subCategory,
            vehicleId,
            projectId,
            projectName,
            engineerName,
            assignedEmployees,
            responsibleFor,
            employeeAmount,
            companyAmount,
            payableDuration,
            monthStart
        } = req.body;

        if (!employeeId) {
            return res.status(400).json({ message: "Employee ID is required" });
        }

        if (!fineType) {
            return res.status(400).json({ message: "Fine Type is required" });
        }

        if (!fineAmount || isNaN(fineAmount) || fineAmount <= 0) {
            return res.status(400).json({ message: "Fine Amount is required and must be greater than zero" });
        }

        let employeeName = '';
        if (employeeId === 'PENDING') {
            employeeName = 'Project Damage (Pending)';
        } else {
            const employee = await EmployeeBasic.findOne({ employeeId })
                .select('firstName lastName employeeId')
                .lean();

            if (!employee) {
                return res.status(404).json({ message: "Employee not found" });
            }
            employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim();
        }

        const fineId = await generateFineId();

        let attachmentData = null;
        if (attachment && attachment.data) {
            try {
                const attachmentDataStr = typeof attachment.data === 'string' ? attachment.data : String(attachment.data);
                const base64Data = attachmentDataStr.startsWith('data:')
                    ? attachmentDataStr
                    : `data:${attachment.mimeType || 'application/pdf'};base64,${attachmentDataStr}`;

                const uploadResult = await uploadDocumentToCloudinary(
                    base64Data,
                    `fines/${employeeId}`,
                    attachment.name || 'fine-attachment.pdf',
                    'raw'
                );

                attachmentData = {
                    url: uploadResult.url,
                    publicId: uploadResult.publicId,
                    name: attachment.name || '',
                    mimeType: attachment.mimeType || 'application/pdf'
                };
            } catch (uploadError) {
                console.error('Error uploading attachment to Cloudinary:', uploadError);
                attachmentData = {
                    data: typeof attachment.data === 'string' ? attachment.data : String(attachment.data),
                    name: attachment.name || '',
                    mimeType: attachment.mimeType || 'application/pdf'
                };
            }
        }

        const fineData = {
            fineId,
            employeeId,
            employeeName,
            fineType: subCategory || fineType || 'Other',
            fineStatus: fineStatus || 'Pending',
            fineAmount: parseFloat(fineAmount),
            description: description || '',
            awardedDate: awardedDate ? new Date(awardedDate) : new Date(),
            remarks: remarks || '',
            attachment: attachmentData,
            category: category || 'Other',
            subCategory: subCategory || '',
            vehicleId: vehicleId || null,
            projectId: projectId || null,
            projectName: projectName || '',
            engineerName: engineerName || '',
            assignedEmployees: assignedEmployees || [],
            responsibleFor: responsibleFor || null,
            employeeAmount: parseFloat(employeeAmount) || 0,
            companyAmount: parseFloat(companyAmount) || 0,
            payableDuration: parseInt(payableDuration) || null,
            monthStart: monthStart || ''
        };

        const fine = new Fine(fineData);
        const savedFine = await fine.save();

        return res.status(201).json({
            message: "Fine created successfully",
            fine: savedFine
        });
    } catch (error) {
        console.error('Error creating fine:', error);
        return res.status(500).json({
            message: error.message || "Failed to create fine",
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

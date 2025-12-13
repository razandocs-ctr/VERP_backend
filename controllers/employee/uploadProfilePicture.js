import cloudinary from '../../config/cloudinary.js';
import EmployeeBasic from '../../models/EmployeeBasic.js';
import { getCompleteEmployee } from '../../services/employeeService.js';

export const uploadProfilePicture = async (req, res) => {
    try {
        console.log('Upload profile picture endpoint hit');
        console.log('Request params:', req.params);
        console.log('Request body keys:', Object.keys(req.body || {}));
        
        const { id } = req.params;
        const { image } = req.body; // Base64 image string

        if (!image) {
            return res.status(400).json({ message: 'Image is required' });
        }

        // Validate base64 image format
        if (!image.startsWith('data:image/')) {
            return res.status(400).json({ message: 'Invalid image format' });
        }

        // Get employeeId from employee record
        const employee = await getCompleteEmployee(id);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        const employeeId = employee.employeeId;

        // Upload to Cloudinary with optimizations
        const uploadResult = await cloudinary.uploader.upload(image, {
            folder: 'employee-profiles',
            resource_type: 'image',
            transformation: [
                {
                    width: 400,
                    height: 400,
                    crop: 'auto',
                    gravity: 'auto',
                    fetch_format: 'auto',
                    quality: 'auto'
                }
            ]
        });

        // Update EmployeeBasic with Cloudinary URL
        const updated = await EmployeeBasic.findOneAndUpdate(
            { employeeId },
            { profilePicture: uploadResult.secure_url },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updated) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Get complete employee data for response
        const completeEmployee = await getCompleteEmployee(employeeId);
        delete completeEmployee.password;

        return res.status(200).json({
            message: 'Profile picture uploaded successfully',
            profilePicture: uploadResult.secure_url,
            employee: completeEmployee
        });
    } catch (error) {
        console.error('Error uploading profile picture:', error);
        return res.status(500).json({
            message: error.message || 'Failed to upload profile picture'
        });
    }
};


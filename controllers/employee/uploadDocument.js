import cloudinary from '../../config/cloudinary.js';
import { resolveEmployeeId } from '../../services/employeeService.js';

/**
 * Upload document to Cloudinary
 * This endpoint allows frontend to upload documents before saving employee data
 * This prevents blocking during save operations
 */
export const uploadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { document, folder, fileName, resourceType } = req.body;

        if (!document) {
            return res.status(400).json({ message: 'Document data is required' });
        }

        // Validate that document is base64 encoded
        if (typeof document !== 'string') {
            return res.status(400).json({ message: 'Document must be a base64 encoded string' });
        }

        // Get employeeId for folder organization
        let employeeId = null;
        if (id) {
            const employee = await resolveEmployeeId(id);
            if (employee) {
                employeeId = employee.employeeId;
            }
        }

        // Determine resource type
        let finalResourceType = resourceType || 'auto';
        if (finalResourceType === 'auto') {
            if (document.startsWith('data:image/')) {
                finalResourceType = 'image';
            } else if (document.startsWith('data:application/pdf')) {
                finalResourceType = 'raw';
            } else if (document.startsWith('data:video/')) {
                finalResourceType = 'video';
            } else {
                finalResourceType = 'raw';
            }
        }

        // Build folder path
        const folderPath = folder || (employeeId ? `employee-documents/${employeeId}` : 'employee-documents');

        // Upload to Cloudinary
        const uploadOptions = {
            folder: folderPath,
            resource_type: finalResourceType,
            use_filename: true,
            unique_filename: true,
            overwrite: false,
        };

        // For images, apply optimizations
        if (finalResourceType === 'image') {
            uploadOptions.transformation = [
                {
                    fetch_format: 'auto',
                    quality: 'auto',
                }
            ];
        }

        // Note: For raw files (PDFs), Cloudinary automatically detects the format
        // Don't set format option for raw uploads as it's not a valid upload parameter

        const uploadResult = await cloudinary.uploader.upload(document, uploadOptions);

        return res.status(200).json({
            success: true,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            format: uploadResult.format,
            resourceType: uploadResult.resource_type
        });
    } catch (error) {
        console.error('Error uploading document to Cloudinary:', error);
        console.error('Error details:', {
            message: error.message,
            http_code: error.http_code,
            name: error.name,
            stack: error.stack,
            cause: error.cause
        });
        
        // Check if it's a Cloudinary configuration error
        if (error.message && error.message.includes('Invalid cloud_name')) {
            return res.status(500).json({
                message: 'Cloudinary configuration error. Please check your CLOUDINARY_CLOUD_NAME environment variable.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        
        if (error.message && (error.message.includes('Invalid API key') || error.message.includes('401'))) {
            return res.status(500).json({
                message: 'Cloudinary authentication error. Please check your CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET environment variables.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        
        return res.status(500).json({
            message: error.message || 'Failed to upload document to Cloudinary',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


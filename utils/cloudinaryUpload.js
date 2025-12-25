import cloudinary from '../config/cloudinary.js';

/**
 * Upload document to Cloudinary
 * @param {string} base64Data - Base64 encoded document data (with or without data URL prefix)
 * @param {string} folder - Cloudinary folder path (e.g., 'employee-documents')
 * @param {string} fileName - Original file name
 * @param {string} resourceType - 'auto', 'image', 'raw', or 'video' (default: 'auto')
 * @returns {Promise<{url: string, publicId: string}>} Cloudinary upload result
 */
export const uploadDocumentToCloudinary = async (base64Data, folder = 'employee-documents', fileName = 'document', resourceType = 'auto') => {
    try {
        // Determine resource type from mime type if not specified
        if (resourceType === 'auto') {
            if (base64Data.startsWith('data:image/')) {
                resourceType = 'image';
            } else if (base64Data.startsWith('data:application/pdf')) {
                resourceType = 'raw'; // PDFs are stored as raw files
            } else if (base64Data.startsWith('data:video/')) {
                resourceType = 'video';
            } else {
                resourceType = 'raw';
            }
        }

        // Upload to Cloudinary
        const uploadOptions = {
            folder: folder,
            resource_type: resourceType,
            use_filename: true,
            unique_filename: true,
            overwrite: false,
        };

        // For images, apply optimizations
        if (resourceType === 'image') {
            uploadOptions.transformation = [
                {
                    fetch_format: 'auto',
                    quality: 'auto',
                }
            ];
        }

        // Note: For raw files (PDFs), Cloudinary automatically detects the format
        // Don't set format option for raw uploads as it's not a valid upload parameter

        const uploadResult = await cloudinary.uploader.upload(base64Data, uploadOptions);

        return {
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            format: uploadResult.format,
            resourceType: uploadResult.resource_type
        };
    } catch (error) {
        console.error('Error uploading document to Cloudinary:', error);
        throw new Error(`Failed to upload document to Cloudinary: ${error.message}`);
    }
};

/**
 * Delete document from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - 'image', 'raw', or 'video' (default: 'raw')
 * @returns {Promise<void>}
 */
export const deleteDocumentFromCloudinary = async (publicId, resourceType = 'raw') => {
    try {
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });
    } catch (error) {
        console.error('Error deleting document from Cloudinary:', error);
        // Don't throw - deletion failures shouldn't break the flow
    }
};


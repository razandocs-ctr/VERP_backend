import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { resolveEmployeeId } from '../../services/employeeService.js';
import s3Client, { bucketName } from '../../config/s3Client.js';
import { randomUUID } from 'crypto';

/**
 * Upload document to IDrive e2 (S3 compatible)
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

        // Process Base64 data
        const base64Data = document.replace(/^data:[\w/]+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');

        // Determine Content-Type and Extension
        let contentType = 'application/octet-stream';
        let extension = 'bin';

        const typeMatch = document.match(/^data:([\w/]+);base64,/);
        if (typeMatch) {
            contentType = typeMatch[1];
            extension = contentType.split('/')[1];
        } else {
            // Fallback inference if header is missing but resourceType is provided
            if (resourceType === 'image') {
                contentType = 'image/jpeg'; // Default assumption
                extension = 'jpg';
            } else if (resourceType === 'raw' && fileName?.endsWith('.pdf')) {
                contentType = 'application/pdf';
                extension = 'pdf';
            }
        }

        // Handle PDF specific extension clarity
        if (contentType === 'application/pdf') extension = 'pdf';

        // Build folder path (S3 Key prefix)
        const folderPath = folder || (employeeId ? `employee-documents/${employeeId}` : 'employee-documents');

        // Generate unique filename if not provided
        const finalFileName = fileName ? fileName : `${randomUUID()}.${extension}`;
        const key = `${folderPath}/${finalFileName}`;

        // Upload to Cloudinary (Replaced by S3)
        const uploadParams = {
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ACL: 'public-read' // Ensure the file is publicly readable
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // Construct public URL
        const endpoint = process.env.IDRIVE_ENDPOINT.startsWith('http')
            ? process.env.IDRIVE_ENDPOINT
            : `https://${process.env.IDRIVE_ENDPOINT}`;

        const publicUrl = `${endpoint}/${bucketName}/${key}`;

        return res.status(200).json({
            success: true,
            url: publicUrl,
            publicId: key, // Use S3 key as publicId
            format: extension,
            resourceType: resourceType || 'auto'
        });
    } catch (error) {
        console.error('Error uploading document to S3:', error);
        console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
        });

        return res.status(500).json({
            message: error.message || 'Failed to upload document to storage',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

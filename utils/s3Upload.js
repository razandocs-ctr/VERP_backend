import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client, { bucketName } from '../config/s3Client.js';
import { randomUUID } from 'crypto';

/**
 * Upload document to IDrive e2 (S3 compatible)
 * @param {string} base64Data - Base64 encoded document data
 * @param {string} folder - Folder path (e.g., 'employee-documents/123')
 * @param {string} fileName - Optional file name
 * @param {string} resourceType - 'auto', 'image', 'raw' (used for extension inference)
 * @returns {Promise<{url: string, publicId: string, format: string, resourceType: string}>}
 */
export const uploadDocumentToS3 = async (base64Data, folder = 'employee-documents', fileName = null, resourceType = 'auto') => {
    try {
        // Clean base64 string
        const cleanBase64 = base64Data.replace(/^data:[\w/]+;base64,/, "");
        const buffer = Buffer.from(cleanBase64, 'base64');

        // Determine Content-Type and Extension
        let contentType = 'application/octet-stream';
        let extension = 'bin';

        const typeMatch = base64Data.match(/^data:([\w/]+);base64,/);
        if (typeMatch) {
            contentType = typeMatch[1];
            extension = contentType.split('/')[1];
        } else {
            // Fallback inference
            if (resourceType === 'image') {
                contentType = 'image/jpeg';
                extension = 'jpg';
            } else if (resourceType === 'raw' && fileName?.endsWith('.pdf')) {
                contentType = 'application/pdf';
                extension = 'pdf';
            }
        }

        // Handle specific extension clarity
        if (contentType === 'application/pdf') extension = 'pdf';
        if (contentType === 'image/jpeg') extension = 'jpg';
        if (contentType === 'image/png') extension = 'png';

        // Generate final filename
        const finalFileName = fileName ? fileName : `${randomUUID()}.${extension}`;

        // Ensure folder doesn't have leading/trailing slashes if it's not empty
        const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
        const key = cleanFolder ? `${cleanFolder}/${finalFileName}` : finalFileName;

        // Upload to S3
        const uploadParams = {
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            ACL: 'private' // Secure: Private access only
        };

        await s3Client.send(new PutObjectCommand(uploadParams));

        // Generate a temporary signed URL for immediate display
        const signedUrl = await getSignedFileUrl(key);

        return {
            url: signedUrl, // Return signed URL for immediate use
            publicId: key,  // Store this Key in DB for future reference
            format: extension,
            resourceType: resourceType || 'auto'
        };

    } catch (error) {
        console.error('Error uploading to S3:', error);
        throw new Error(`Failed to upload to storage: ${error.message}`);
    }
};

/**
 * Generate a signed URL for a private file
 * @param {string} key - The S3 key (file path)
 * @param {number} expiresIn - Expiration time in seconds (default 3600 = 1 hour)
 * @returns {Promise<string>} Signed URL
 */
export const getSignedFileUrl = async (key, expiresIn = 7200) => {
    try {
        if (!key) return null;

        // If key is already a full URL, try to extract Key or return as is
        // But for new system, we expect Key.
        if (key.startsWith('http')) return key;

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        });

        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return url;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return null; // Return null if failed so frontend handles it gracefully
    }
};

/**
 * Delete document from IDrive e2
 * @param {string} key - The S3 key (file path)
 * @returns {Promise<void>}
 */
export const deleteDocumentFromS3 = async (key) => {
    try {
        if (!key) return;

        const deleteParams = {
            Bucket: bucketName,
            Key: key,
        };

        await s3Client.send(new DeleteObjectCommand(deleteParams));
        console.log(`Successfully deleted ${key} from S3`);
    } catch (error) {
        console.error('Error deleting from S3:', error);
        // Don't throw for delete errors to avoid breaking main flows
    }
};

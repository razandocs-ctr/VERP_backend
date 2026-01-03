# Secure S3 Storage with IDrive e2 & Node.js

This guide provides a complete example of implementing secure, private file storage using IDrive e2 (S3-compatible), including private uploads, database storage, and generating temporary signed URLs that sync with your session duration.

## 1. S3 Client Configuration (`config/s3Client.js`)
Configures the AWS SDK v3 client. Key detail: `forcePathStyle: false` to prevent 302 redirects with IDrive e2.

```javascript
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

// Ensure endpoint has https:// protocol
const endpoint = process.env.IDRIVE_ENDPOINT && !process.env.IDRIVE_ENDPOINT.startsWith('http')
    ? `https://${process.env.IDRIVE_ENDPOINT}`
    : process.env.IDRIVE_ENDPOINT;

const s3Client = new S3Client({
    region: "ap-southeast-1", // Match your IDrive bucket region
    endpoint: endpoint,
    credentials: {
        accessKeyId: process.env.IDRIVE_ACCESS_KEY,
        secretAccessKey: process.env.IDRIVE_SECRET_KEY,
    },
    // CRITICAL: Use false to use Virtual-Hosted style (https://bucket.endpoint/key)
    // This avoids 302 Redirects which cause CORS errors in browsers.
    forcePathStyle: false, 
});

export const bucketName = process.env.IDRIVE_BUCKET_NAME;
export default s3Client;
```

## 2. File Service (`services/fileService.js`)
Handles private uploads and generating signed URLs.

```javascript
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client, { bucketName } from '../config/s3Client.js';
import { randomUUID } from 'crypto';

/**
 * Uploads a file privately.
 * Returns the 'key' (publicId) to store in DB, NOT the URL.
 */
export const uploadFile = async (base64Data, folder = 'uploads') => {
    // 1. Parse Base64
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) throw new Error('Invalid base64 string');
    
    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const extension = contentType.split('/')[1] || 'bin';
    
    // 2. Generate Unique Key
    const key = `${folder}/${randomUUID()}.${extension}`;

    // 3. Upload with ACL: 'private'
    await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'private' // <--- SECURE: Not accessible via public URL
    }));

    // 4. Return Key and a temporary URL for immediate frontend display
    const signedUrl = await getSignedFileUrl(key);
    
    return {
        publicId: key, // Store this in MongoDB
        url: signedUrl 
    };
};

/**
 * Generates a signed URL.
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Expiration in seconds
 */
export const getSignedFileUrl = async (key, expiresIn = 3600) => {
    if (!key) return null;
    
    // Check for Legacy URL support (if key is actually a URL)
    if (key.startsWith('http')) {
         return resolveLegacyUrl(key, expiresIn);
    }

    try {
        const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
        // Generate signed URL
        return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
        console.error('Sign error:', error);
        return null;
    }
};

// Fallback for old files stored as raw URLs
const resolveLegacyUrl = async (url, expiresIn) => {
    if (url.includes(bucketName) && url.includes(process.env.IDRIVE_ENDPOINT)) {
         // Logic to extract "/folder/file.ext" from the full URL
         // ... (See implementation in your project)
         // Then call getSignedUrl(extractedKey, expiresIn)
    }
    return url;
};
```

## 3. Express Route & JWT Sync (`routes/userRoutes.js`)
Demonstrates storing the key and retrieving it with an expiration that matches the JWT session.

```javascript
import express from 'express';
import { uploadFile, getSignedFileUrl } from '../services/fileService.js';
import User from '../models/User.js';

const router = express.Router();
// Assume standard 24h JWT session
const SESSION_DURATION_SECONDS = 24 * 60 * 60; // 86400 seconds

// POST: Upload Profile Picture
router.post('/upload-avatar', async (req, res) => {
    try {
        const { base64, userId } = req.body;
        const uploadResult = await uploadFile(base64, `users/${userId}`);
        
        // SAVE: Only the publicId (Key)
        await User.findByIdAndUpdate(userId, { 
            avatar: { publicId: uploadResult.publicId } 
        });

        res.json({ success: true, url: uploadResult.url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Fetch User Profile
router.get('/profile/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).lean();

        // READ: Generate Signed URL synced with Session Duration
        // This ensures the link implies "permanence" for the user's active session.
        if (user.avatar?.publicId) {
            user.avatar.url = await getSignedFileUrl(
                user.avatar.publicId, 
                SESSION_DURATION_SECONDS // <--- Sync with JWT expiration
            );
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
```

## 4. Key Takeaways
1.  **Block Public Access**: Always use `ACL: 'private'`.
2.  **Store Keys, Not URLs**: Your database should store `users/123/avatar.png`, not `https://...`.
3.  **Sign on Read**: Generate the URL only when the data is requested.
4.  **Sync Expiration**: Set the `expiresIn` parameter of the signed URL to match your Auth Token's lifespan (e.g., 24h or 86400s) to prevent "Access Denied" errors while the user is still logged in.

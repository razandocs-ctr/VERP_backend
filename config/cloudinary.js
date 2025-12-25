import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Validate Cloudinary configuration
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
    console.warn('⚠️  Cloudinary configuration missing! Please set the following environment variables:');
    if (!cloudName) console.warn('   - CLOUDINARY_CLOUD_NAME');
    if (!apiKey) console.warn('   - CLOUDINARY_API_KEY');
    if (!apiSecret) console.warn('   - CLOUDINARY_API_SECRET');
    console.warn('   Document uploads will fail until these are configured.');
} else {
    console.log('✅ Cloudinary configured successfully');
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});

export default cloudinary;


import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const s3Client = new S3Client({
    region: "ap-southeast-1",
    endpoint: process.env.IDRIVE_ENDPOINT.startsWith('http') ? process.env.IDRIVE_ENDPOINT : `https://${process.env.IDRIVE_ENDPOINT}`,
    credentials: {
        accessKeyId: process.env.IDRIVE_ACCESS_KEY,
        secretAccessKey: process.env.IDRIVE_SECRET_KEY,
    }
});

const bucket = 'verp-storage';
// Extract key from the URL provided in the error
// URL: https://s3.ap-southeast-1.idrivee2.com/verp-storage/employee-profiles/18881-04f768fa-1c6f-4cbd-b11f-c41dc7079b04.png
const key = 'employee-profiles/18881-04f768fa-1c6f-4cbd-b11f-c41dc7079b04.png';

async function checkImage() {
    console.log(`Checking object: ${key} in bucket: ${bucket}`);
    try {
        const cmd = new HeadObjectCommand({ Bucket: bucket, Key: key });
        const response = await s3Client.send(cmd);
        console.log('SUCCESS: Object found.');
        console.log('Content-Type:', response.ContentType);
        console.log('Content-Length:', response.ContentLength);
        console.log('LastModified:', response.LastModified);
    } catch (error) {
        console.error('ERROR: Could not retrieve object metadata.');
        console.error(error.name, error.message);
    }
}

checkImage();

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

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
const prefix = 'employee-profiles/';

async function checkPublicAccess() {
    try {
        console.log(`1. Listing objects in ${bucket}/${prefix}...`);
        const cmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix });
        const res = await s3Client.send(cmd);

        if (!res.Contents || res.Contents.length === 0) {
            console.log('No images found.');
            return;
        }

        // Sort by date to get latest
        const latest = res.Contents.sort((a, b) => b.LastModified - a.LastModified)[0];
        console.log(`Latest file: ${latest.Key}`);
        console.log(`Last Modified: ${latest.LastModified}`);

        // Construct Public URL
        const endpointRaw = process.env.IDRIVE_ENDPOINT.replace('https://', '').replace('http://', '');
        const publicUrl = `https://${endpointRaw}/${bucket}/${latest.Key}`;
        console.log(`\n2. Testing Public URL: ${publicUrl}`);

        // Try to fetch without credentials
        https.get(publicUrl, (resp) => {
            console.log(`HTTP Status Code: ${resp.statusCode}`);

            if (resp.statusCode === 200) {
                console.log('SUCCESS! The file is publicly accessible.');
            } else if (resp.statusCode === 403) {
                console.log('FAILURE: Access Denied (403). The bucket is blocking public access.');
            } else {
                console.log(`FAILURE: Received status ${resp.statusCode}`);
            }
        }).on("error", (err) => {
            console.log("Error: " + err.message);
        });

    } catch (error) {
        console.error('Script Error:', error);
    }
}

checkPublicAccess();

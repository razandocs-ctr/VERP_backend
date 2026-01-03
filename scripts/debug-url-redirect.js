import s3Client, { bucketName } from '../config/s3Client.js';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import https from 'https';

const debugUrl = async () => {
    const key = 'debug-test.txt';
    const content = 'Hello World';

    // 1. Upload Test File
    console.log(`Uploading test file to ${bucketName}/${key}...`);
    await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: content,
        ContentType: 'text/plain',
        ACL: 'public-read'
    }));
    console.log('Upload complete.');

    // 2. Construct Path-Style URL
    const endpoint = process.env.IDRIVE_ENDPOINT.startsWith('http')
        ? process.env.IDRIVE_ENDPOINT
        : `https://${process.env.IDRIVE_ENDPOINT}`;

    const pathStyleUrl = `${endpoint}/${bucketName}/${key}`;
    console.log(`Testing Path-Style URL: ${pathStyleUrl}`);

    // 3. Check for Redirect
    const checkUrl = (url) => {
        return new Promise((resolve) => {
            https.get(url, (res) => {
                console.log(`\nResponse Status: ${res.statusCode}`);
                console.log('Headers:', res.headers);

                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    console.log(`\n⚠️ Redirect detected to: ${res.headers.location}`);
                }
                resolve();
            }).on('error', (e) => {
                console.error(`Error fetching URL: ${e.message}`);
                resolve();
            });
        });
    };

    await checkUrl(pathStyleUrl);

    // 4. Construct Virtual-Hosted Style URL (Try this too)
    // Assuming endpoint follows structure s3.region.domain
    const urlParts = endpoint.replace('https://', '').split('.');
    const domain = urlParts.slice(1).join('.'); // e.g. ap-southeast-1.idrivee2.com
    // Note: IDrive might not support bucket.s3.region... depending on setup, but let's try bucket.endpoint

    // Often: bucket.endpoint
    const vhostUrl = `https://${bucketName}.${endpoint.replace('https://', '')}/${key}`;
    console.log(`\nTesting VHost-Style URL: ${vhostUrl}`);
    await checkUrl(vhostUrl);
};

debugUrl();

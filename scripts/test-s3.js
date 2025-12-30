import { S3Client, ListBucketsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const s3Client = new S3Client({
    region: "ap-southeast-1",
    endpoint: process.env.IDRIVE_ENDPOINT.startsWith('http') ? process.env.IDRIVE_ENDPOINT : `https://${process.env.IDRIVE_ENDPOINT}`,
    credentials: {
        accessKeyId: process.env.IDRIVE_ACCESS_KEY,
        secretAccessKey: process.env.IDRIVE_SECRET_KEY,
    },
    forcePathStyle: true,
});

async function runTest() {
    let output = '';
    const log = (msg) => {
        console.log(msg);
        output += msg + '\n';
    };

    try {
        log('--- S3 DIAGNOSTIC (Dynamic) ---');
        log(`ENV Endpoint: ${process.env.IDRIVE_ENDPOINT}`);
        log(`ENV Bucket: ${process.env.IDRIVE_BUCKET_NAME}`);

        log('\nSTEP 1: LISTING BUCKETS...');
        const listCmd = new ListBucketsCommand({});
        const listRes = await s3Client.send(listCmd);

        log('Success! Found the following buckets:');
        const bucketNames = listRes.Buckets.map(b => b.Name);
        bucketNames.forEach(b => log(` - ${b}`));

        const targetBucket = process.env.IDRIVE_BUCKET_NAME;
        if (!bucketNames.includes(targetBucket)) {
            log(`\nCRITICAL ERROR: The bucket '${targetBucket}' is NOT in the list above.`);
            log('The bucket name in your .env file does not exist in this IDrive account.');
        } else {
            log(`\nSUCCESS: Target bucket '${targetBucket}' exists.`);

            log(`\nSTEP 2: Attempting upload to '${targetBucket}'...`);
            const putCmd = new PutObjectCommand({
                Bucket: targetBucket,
                Key: 'test-env-upload.txt',
                Body: 'Env var upload test',
                ContentType: 'text/plain',
                ACL: 'public-read'
            });
            await s3Client.send(putCmd);
            log('Success! Test file uploaded with public-read ACL.');
        }

    } catch (error) {
        log('\n--- OPERATION FAILED ---');
        log('Error Name: ' + error.name);
        log('Error Message: ' + error.message);
    } finally {
        fs.writeFileSync(path.join(__dirname, '../s3_buckets_list.txt'), output);
        console.log('Output written to s3_buckets_list.txt');
    }
}

runTest();

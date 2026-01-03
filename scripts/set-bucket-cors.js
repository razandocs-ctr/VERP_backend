import { PutBucketCorsCommand } from "@aws-sdk/client-s3";
import s3Client, { bucketName } from '../config/s3Client.js';

const configureCors = async () => {
    console.log(`Configuring CORS for bucket: ${bucketName}`);

    const corsParams = {
        Bucket: bucketName,
        CORSConfiguration: {
            CORSRules: [
                {
                    AllowedHeaders: ["*"],
                    AllowedMethods: ["GET", "HEAD", "PUT", "POST", "DELETE"],
                    AllowedOrigins: ["*"], // For development; restrict this in production if needed
                    ExposeHeaders: ["ETag"],
                    MaxAgeSeconds: 3000
                }
            ]
        }
    };

    try {
        const command = new PutBucketCorsCommand(corsParams);
        await s3Client.send(command);
        console.log("✅ CORS configuration applied successfully!");
    } catch (error) {
        console.error("❌ Failed to configure CORS:", error);
    }
};

configureCors();

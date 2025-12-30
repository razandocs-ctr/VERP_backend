import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import fs from 'fs';

const output = `ENDPOINT=${process.env.IDRIVE_ENDPOINT}\nBUCKET=${process.env.IDRIVE_BUCKET_NAME}`;
fs.writeFileSync(path.join(__dirname, '../env_check_v2.txt'), output);
console.log('Written to env_check_v2.txt');

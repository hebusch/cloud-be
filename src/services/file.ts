import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config();

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

export async function deleteFile(filename: string) {
  if (!fs.existsSync(path.join(UPLOAD_DIR, filename))) {
    return;
  }
  fs.unlinkSync(path.join(UPLOAD_DIR, filename));
}

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

const configured = Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);

function sign(params) {
  const payload = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '').sort(([a],[b]) => a.localeCompare(b)).map(([key,value]) => `${key}=${value}`).join('&');
  return crypto.createHash('sha1').update(`${payload}${env.cloudinaryApiSecret}`).digest('hex');
}

export async function storeImage(file, folder) {
  if (!file) throw new Error('Image file is required.');
  if (!configured) {
    if (process.env.VERCEL === '1' && env.nodeEnv === 'production') {
      const error = new Error('Cloudinary must be configured for persistent image uploads on Vercel.');
      error.status = 503;
      throw error;
    }
    return { url: `/uploads/${file.filename}`, provider: 'local' };
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = path.basename(file.filename, path.extname(file.filename));
  const signature = sign({ folder, public_id: publicId, timestamp });
  const body = new FormData();
  body.append('file', new Blob([await fs.readFile(file.path)], { type: file.mimetype }), file.originalname);
  body.append('api_key', env.cloudinaryApiKey);
  body.append('timestamp', String(timestamp));
  body.append('folder', folder);
  body.append('public_id', publicId);
  body.append('signature', signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`, { method: 'POST', body });
  const data = await response.json();
  if (!response.ok || !data.secure_url) throw new Error('Cloud image storage upload failed.');
  await fs.unlink(file.path).catch(() => {});
  return { url: data.secure_url, provider: 'cloudinary' };
}

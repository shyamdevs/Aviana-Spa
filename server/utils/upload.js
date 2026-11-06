import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import { audit } from './audit.js';
import { inspectImageFile } from './imageCheck.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === '1';
const uploadDir = isVercel ? path.join(os.tmpdir(), 'aviana-uploads') : path.resolve(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// The stored name is generated entirely server-side; nothing from the client reaches the path.
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${crypto.randomBytes(16).toString('hex')}.upload`),
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5, fieldSize: 1024 },
  // First, cheap gate only. The authoritative check is verifyUploadedImage (file signature).
  fileFilter: (req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.mimetype) || !/\.(jpe?g|png|webp|avif)$/i.test(file.originalname)) return cb(new Error('File type not allowed.'));
    return cb(null, true);
  },
});

const safeUnlink = (p) => fs.promises.unlink(p).catch(() => {});

// Runs after multer: validates the real bytes, renames to <random><true extension>, and deletes
// the temp file on every failure path.
export async function verifyUploadedImage(req, res, next) {
  if (!req.file) return next();
  try {
    const info = await inspectImageFile(req.file.path);
    if (!info.ok) {
      await safeUnlink(req.file.path);
      await audit({ type: 'upload_rejected', severity: 'warn', req, outcome: 'blocked', meta: { reason: info.reason } });
      return res.status(400).json({ success: false, message: 'Only genuine JPG, PNG, WEBP or AVIF images up to 5MB (16-8000 px per side) are allowed.' });
    }
    const finalName = `${path.basename(req.file.filename, '.upload')}${info.ext}`;
    const finalPath = path.join(uploadDir, finalName);
    await fs.promises.rename(req.file.path, finalPath);
    Object.assign(req.file, { filename: finalName, path: finalPath, mimetype: info.type });
    return next();
  } catch (error) {
    await safeUnlink(req.file.path);
    return next(error);
  }
}

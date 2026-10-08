import path from 'node:path';
import multer from 'multer';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isVercel = process.env.VERCEL === '1';
const uploadDir = isVercel ? path.join(os.tmpdir(), 'aviana-uploads') : path.resolve(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const actorId = (req) => req.user?._id?.toString() || req.admin?._id?.toString() || 'aviana';

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-z0-9_-]/gi, '-').slice(0, 40);
    cb(null, `${actorId(req)}-${Date.now()}-${safeBase}${path.extname(file.originalname).toLowerCase()}`);
  },
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validMime = /^image\/(jpeg|png|webp|avif)$/.test(file.mimetype);
    const validExt = /\.(jpe?g|png|webp|avif)$/i.test(file.originalname);
    if (!validMime || !validExt) return cb(new Error('File type not allowed.'));
    cb(null, true);
  },
});

// Server-side image validation that does NOT trust the client's MIME type or file name.
// It verifies the file signature, parses the real dimensions from the container header, and
// enforces size/dimension/pixel limits. SVG, HTML and anything else is rejected by default.
// NOTE: full decode + re-encode (stripping metadata and polyglot payloads) needs `sharp`, which
// cannot be installed in this environment. See the report: add sharp before relying on re-encoding.
import fs from 'node:fs/promises';

export const LIMITS = { maxBytes: 5 * 1024 * 1024, maxSide: 8000, maxPixels: 36_000_000, minSide: 16 };

function png(b) {
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47 || b.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { type: 'image/png', ext: '.png', w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
function jpeg(b) {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { type: 'image/jpeg', ext: '.jpg', h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}
function webp(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const t = b.toString('ascii', 12, 16);
  if (t === 'VP8X') return { type: 'image/webp', ext: '.webp', w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (t === 'VP8L') { const v = b.readUInt32LE(21); return { type: 'image/webp', ext: '.webp', w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
  if (t === 'VP8 ') return { type: 'image/webp', ext: '.webp', w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  return null;
}
function avif(b) {
  if (b.length < 32 || b.toString('ascii', 4, 8) !== 'ftyp' || !/avif|avis/.test(b.toString('ascii', 8, 32))) return null;
  const at = b.indexOf('ispe'); // image spatial extents box
  if (at < 0 || at + 16 > b.length) return null;
  return { type: 'image/avif', ext: '.avif', w: b.readUInt32BE(at + 8), h: b.readUInt32BE(at + 12) };
}

export function inspectImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0 || buf.length > LIMITS.maxBytes) return { ok: false, reason: 'size' };
  const info = png(buf) || jpeg(buf) || webp(buf) || avif(buf);
  if (!info) return { ok: false, reason: 'type' };
  const { w, h } = info;
  if (!(w >= LIMITS.minSide && h >= LIMITS.minSide) || w > LIMITS.maxSide || h > LIMITS.maxSide || w * h > LIMITS.maxPixels) return { ok: false, reason: 'dimensions' };
  return { ok: true, ...info };
}

export async function inspectImageFile(path) {
  const handle = await fs.open(path, 'r');
  try {
    const { size } = await handle.stat();
    if (size > LIMITS.maxBytes) return { ok: false, reason: 'size' };
    const buf = Buffer.alloc(Math.min(size, 256 * 1024)); // headers live at the start of every supported format
    await handle.read(buf, 0, buf.length, 0);
    return inspectImage(buf);
  } finally { await handle.close(); }
}

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Minimal pure-Node PNG encoder (RGBA) for PWA icons
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crcVal = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, {level: 6});
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawIcon(size, maskable = false) {
  const buf = Buffer.alloc(size * size * 4);
  const pad = maskable ? size * 0.16 : size * 0.04;
  const cornerRadius = maskable ? 0 : size * 0.22;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Rounded rect clip for standard icons
      let inside = true;
      if (cornerRadius > 0) {
        const cx = x < cornerRadius ? cornerRadius : x > size - cornerRadius ? size - cornerRadius : x;
        const cy = y < cornerRadius ? cornerRadius : y > size - cornerRadius ? size - cornerRadius : y;
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > cornerRadius * cornerRadius) inside = false;
      }
      if (!inside) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Gradient from #1D75F0 to #061B3D
      const t = (x + y) / (2 * size);
      let r = Math.round(29 * (1 - t) + 6 * t);
      let g = Math.round(117 * (1 - t) + 27 * t);
      let b = Math.round(240 * (1 - t) + 61 * t);

      // Normalized coordinates inside safe zone
      const nx = (x - pad) / (size - 2 * pad);
      const ny = (y - pad) / (size - 2 * pad);

      // Draw crisp smartphone outline + upward spark inside safe zone
      if (nx >= 0.24 && nx <= 0.76 && ny >= 0.14 && ny <= 0.86) {
        const border = 0.055;
        const isEdge =
          nx < 0.24 + border ||
          nx > 0.76 - border ||
          ny < 0.14 + border ||
          ny > 0.86 - border;
        // Rounded outer corners of inner phone
        const inCorner =
          (nx < 0.31 && ny < 0.21 && Math.hypot(nx - 0.31, ny - 0.21) > 0.07) ||
          (nx > 0.69 && ny < 0.21 && Math.hypot(nx - 0.69, ny - 0.21) > 0.07) ||
          (nx < 0.31 && ny > 0.79 && Math.hypot(nx - 0.31, ny - 0.79) > 0.07) ||
          (nx > 0.69 && ny > 0.79 && Math.hypot(nx - 0.69, ny - 0.79) > 0.07);

        if (isEdge && !inCorner) {
          r = 255;
          g = 255;
          b = 255;
        }
      }

      // Top speaker bar
      if (nx >= 0.42 && nx <= 0.58 && ny >= 0.24 && ny <= 0.28) {
        r = 255;
        g = 255;
        b = 255;
      }

      // Bright blue upward chevron/T core
      if (nx >= 0.465 && nx <= 0.535 && ny >= 0.38 && ny <= 0.66) {
        r = 147;
        g = 197;
        b = 253;
      }
      if (nx >= 0.37 && nx <= 0.63 && ny >= 0.38 && ny <= 0.445) {
        r = 255;
        g = 255;
        b = 255;
      }

      // Home dot
      if (Math.hypot(nx - 0.5, ny - 0.74) <= 0.032) {
        r = 255;
        g = 255;
        b = 255;
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = 255;
    }
  }
  return encodePNG(size, size, buf);
}

const outDir = path.resolve(process.cwd(), 'public');
fs.mkdirSync(outDir, {recursive: true});
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), drawIcon(192, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), drawIcon(512, false));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), drawIcon(512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), drawIcon(180, false));
console.log('Generated PNG PWA icons in public/');

// Generates pwa-192x192.png and pwa-512x512.png for the UNZA Clinic PWA
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// CRC32 for PNG chunks
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size, draw) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const stride = size * 4 + 1;
  const raw = Buffer.alloc(size * stride);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size);
      const o = y * stride + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// UNZA Clinic icon: blue rounded square + white medical cross + "U" ring
function draw(x, y, S) {
  const cx = S / 2, cy = S / 2;
  const pad = S * 0.08;
  const radius = S * 0.22; // corner radius of rounded square
  const BG = [37, 99, 235]; // #2563EB (blue)

  // Rounded square bounds
  const left = pad, right = S - pad, top = pad, bottom = S - pad;
  function inRoundedRect(px, py) {
    if (px < left || px > right || py < top || py > bottom) return false;
    const corners = [[left + radius, top + radius], [right - radius, top + radius],
                     [right - radius, bottom - radius], [left + radius, bottom - radius]];
    for (const [cx2, cy2] of corners) {
      if (px < cx2 && py < cy2 && (px - cx2) ** 2 + (py - cy2) ** 2 > radius ** 2) return false;
      if (px > right - radius && py < top + radius && (px - (right - radius)) ** 2 + (py - (top + radius)) ** 2 > radius ** 2) return false;
    }
    return true;
  }
  // Simpler rounded-rect: shrink corners
  function inRR(px, py) {
    if (px < left || px > right || py < top || py > bottom) return false;
    if (px < left + radius && py < top + radius) return (px - left - radius) ** 2 + (py - top - radius) ** 2 <= radius ** 2;
    if (px > right - radius && py < top + radius) return (px - right + radius) ** 2 + (py - top - radius) ** 2 <= radius ** 2;
    if (px < left + radius && py > bottom - radius) return (px - left - radius) ** 2 + (py - bottom + radius) ** 2 <= radius ** 2;
    if (px > right - radius && py > bottom - radius) return (px - right + radius) ** 2 + (py - bottom + radius) ** 2 <= radius ** 2;
    return true;
  }

  if (!inRR(x, y)) return [0, 0, 0, 0]; // transparent outside

  // White medical cross
  const cw = S * 0.13, ch = S * 0.38;
  const inH = Math.abs(x - cx) <= ch / 2 && Math.abs(y - cy) <= cw / 2;
  const inV = Math.abs(x - cx) <= cw / 2 && Math.abs(y - cy) <= ch / 2;
  if (inH || inV) return [255, 255, 255, 255];

  // "+" cross shadow (subtle depth)
  const inHS = Math.abs(x - cx - 1) <= ch / 2 && Math.abs(y - cy + 1) <= cw / 2;
  const inVS = Math.abs(x - cx - 1) <= cw / 2 && Math.abs(y - cy + 1) <= ch / 2;
  if (inHS || inVS) return [20, 70, 200, 180];

  return [...BG, 255];
}

const publicDir = path.join(__dirname, "..", "public");
for (const size of [192, 512]) {
  const out = path.join(publicDir, `pwa-${size}x${size}.png`);
  fs.writeFileSync(out, makePNG(size, draw));
  console.log(`✓  public/pwa-${size}x${size}.png  (${size}×${size})`);
}

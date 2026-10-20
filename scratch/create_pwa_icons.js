const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
function makeCrcTable() {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  return crcTable;
}
const crcTable = makeCrcTable();

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function createPng(width, height, getPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with filter byte (0) per scanline
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Ensure public/icons directory
const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generate Top-X Cyber Brand Icon (Orange gradient, cyber nodes, bold 'TOP-X' badge)
function getTopXPixel(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Maskable safe zone is inner 80% (center 0.1 to 0.9)
  const scale = isMaskable ? 0.72 : 0.88;
  const cx = 0.5;
  const cy = 0.5;
  const sx = (nx - cx) / scale + cx;
  const sy = (ny - cy) / scale + cy;

  // Background: Warm sleek dark cyber or radiant orange
  // Deep charcoal background (#0d0d0f) with subtle radial glow
  const distFromCenter = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2);
  let bgR = 13, bgG = 13, bgB = 15; // #0d0d0f

  // Subtle orange glow at center
  const glow = Math.max(0, 1 - distFromCenter * 1.6);
  bgR = Math.min(255, Math.round(bgR + glow * 50));
  bgG = Math.min(255, Math.round(bgG + glow * 20));
  bgB = Math.min(255, Math.round(bgB + glow * 5));

  // Outer border if not maskable
  if (!isMaskable) {
    const rBorder = 0.12; // corner radius relative
    const inBox = (nx >= 0.04 && nx <= 0.96 && ny >= 0.04 && ny <= 0.96);
    if (!inBox) {
      return [0, 0, 0, 0]; // transparent outside
    }
  }

  // Draw 3-Node Top-X triangle
  // Node 1: Top (0.5, 0.32)
  // Node 2: Bottom-Left (0.32, 0.68)
  // Node 3: Bottom-Right (0.68, 0.68)
  const topNode = { x: 0.5, y: 0.32 };
  const leftNode = { x: 0.31, y: 0.68 };
  const rightNode = { x: 0.69, y: 0.68 };
  const nodeRadius = 0.085;

  function dist(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  function distToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return dist(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return dist(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
  }

  const p = { x: sx, y: sy };

  // Connect lines: top to left, top to right
  const line1Dist = distToSegment(p, topNode, leftNode);
  const line2Dist = distToSegment(p, topNode, rightNode);
  const lineWidth = 0.022;

  // Check nodes
  const dTop = dist(p, topNode);
  const dLeft = dist(p, leftNode);
  const dRight = dist(p, rightNode);

  // Right node is vibrant electric orange (#ff7a1a)
  if (dRight <= nodeRadius) {
    if (dRight > nodeRadius - 0.008) return [255, 255, 255, 255]; // white rim
    return [255, 122, 26, 255]; // orange node
  }

  // Top node is crisp white/silver (#ffffff)
  if (dTop <= nodeRadius) {
    if (dTop > nodeRadius - 0.008) return [255, 122, 26, 255]; // orange rim
    return [255, 255, 255, 255]; // white node
  }

  // Left node is bright cyan/white (#f8fafc)
  if (dLeft <= nodeRadius) {
    if (dLeft > nodeRadius - 0.008) return [255, 255, 255, 255];
    return [240, 243, 246, 255];
  }

  // Lines connecting
  if (line1Dist <= lineWidth || line2Dist <= lineWidth) {
    return [255, 255, 255, 240];
  }

  return [bgR, bgG, bgB, 255];
}

console.log('Generating PWA Icons...');

const icon192 = createPng(192, 192, (x, y, w, h) => getTopXPixel(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'icon-192.png'), icon192);

const icon512 = createPng(512, 512, (x, y, w, h) => getTopXPixel(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), icon512);

const maskable192 = createPng(192, 192, (x, y, w, h) => getTopXPixel(x, y, w, h, true));
fs.writeFileSync(path.join(outDir, 'icon-maskable-192.png'), maskable192);

const maskable512 = createPng(512, 512, (x, y, w, h) => getTopXPixel(x, y, w, h, true));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), maskable512);

const appleTouch = createPng(180, 180, (x, y, w, h) => getTopXPixel(x, y, w, h, false));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), appleTouch);

// Also write crisp scalable SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="110" fill="#0d0d0f"/>
  <circle cx="256" cy="256" r="180" fill="url(#radialGlow)" opacity="0.4"/>
  <defs>
    <radialGradient id="radialGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff7a1a" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0d0d0f" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Connector lines -->
  <line x1="256" y1="160" x2="160" y2="340" stroke="#ffffff" stroke-width="26" stroke-linecap="round"/>
  <line x1="256" y1="160" x2="352" y2="340" stroke="#ffffff" stroke-width="26" stroke-linecap="round"/>
  <!-- Nodes -->
  <circle cx="256" cy="160" r="44" fill="#ffffff" stroke="#ff7a1a" stroke-width="8"/>
  <circle cx="160" cy="340" r="44" fill="#f8fafc" stroke="#ffffff" stroke-width="8"/>
  <circle cx="352" cy="340" r="44" fill="#ff7a1a" stroke="#ffffff" stroke-width="8"/>
</svg>`;
fs.writeFileSync(path.join(outDir, 'icon.svg'), svgContent, 'utf8');

console.log('Successfully generated all PWA icons in public/icons!');

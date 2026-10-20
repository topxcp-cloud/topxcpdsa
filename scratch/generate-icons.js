const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Exact 8-Polygon Angular Geometric Mark with zero wasted padding and thicker strokes for maximum tab visibility
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="345 155 900 490" width="512" height="512">
  <style>
    .chevron { fill: #111827; }
    @media (prefers-color-scheme: dark) {
      .chevron { fill: #FFFFFF; }
    }
  </style>
  <g>
    <!-- Chevrons with bold accent border for maximum size & sharpness -->
    <polygon class="chevron" stroke="#ff7a1a" stroke-width="16" stroke-linejoin="round" points="538,208 587,254 449,393 579,527 529,577 354,395" />
    <polygon class="chevron" stroke="#ff7a1a" stroke-width="16" stroke-linejoin="round" points="1059,208 1239,392 1059,575 1011,527 1143,391 1009,254" />
    <!-- Center X geometric mark with reinforced geometry -->
    <polygon fill="#ff7a1a" stroke="#ff7a1a" stroke-width="8" stroke-linejoin="round" points="988,159 1027,159 547,640 508,640" />
    <polygon fill="#4B5563" stroke="#4B5563" stroke-width="6" stroke-linejoin="round" points="625,255 717,255 796,334 745,383 678,313" />
    <polygon fill="#ff7a1a" stroke="#ff7a1a" stroke-width="6" stroke-linejoin="round" points="625,367 678,313 745,383 694,438" />
    <polygon fill="#ff7a1a" stroke="#ff7a1a" stroke-width="6" stroke-linejoin="round" points="942,334 989,382 897,478 850,430" />
    <polygon fill="#4B5563" stroke="#4B5563" stroke-width="6" stroke-linejoin="round" points="770,433 813,390 850,430 897,478 959,544 871,544" />
    <polygon fill="#FFA477" stroke="#FFA477" stroke-width="6" stroke-linejoin="round" points="832,369 870,410 850,430 813,390" />
  </g>
</svg>`;

async function run() {
  const publicIconsDir = path.resolve(__dirname, '../public/icons');
  const publicDir = path.resolve(__dirname, '../public');
  const appDir = path.resolve(__dirname, '../app');

  if (!fs.existsSync(publicIconsDir)) {
    fs.mkdirSync(publicIconsDir, { recursive: true });
  }

  // 1. Write the modern vector SVG icon
  fs.writeFileSync(path.join(publicIconsDir, 'icon.svg'), svgContent, 'utf8');
  console.log('Saved public/icons/icon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // 2. Generate PNGs: 512, 192, apple-touch (180), and favicons
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicIconsDir, 'icon-512.png'));
  await sharp(svgBuffer).resize(512, 512).png().toFile(path.join(publicIconsDir, 'icon-maskable-512.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicIconsDir, 'icon-192.png'));
  await sharp(svgBuffer).resize(192, 192).png().toFile(path.join(publicIconsDir, 'icon-maskable-192.png'));
  await sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicIconsDir, 'apple-touch-icon.png'));
  console.log('Generated PNG icons in public/icons');

  // 3. Generate favicon-32.png and favicon-16.png
  const png32 = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  const png16 = await sharp(svgBuffer).resize(16, 16).png().toBuffer();
  fs.writeFileSync(path.join(publicIconsDir, 'favicon-32x32.png'), png32);
  fs.writeFileSync(path.join(publicIconsDir, 'favicon-16x16.png'), png16);

  // 4. Create standard ICO file for root /favicon.ico (both public/favicon.ico and app/favicon.ico)
  // An ICO file containing 16x16 and 32x32 PNG entries
  function createIco(pngBuffers) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // reserved
    header.writeUInt16LE(1, 2); // icon type
    header.writeUInt16LE(pngBuffers.length, 4); // number of images

    let offset = 6 + (16 * pngBuffers.length);
    const directoryEntries = [];
    for (const { buffer, width, height } of pngBuffers) {
      const entry = Buffer.alloc(16);
      entry.writeUInt8(width >= 256 ? 0 : width, 0);
      entry.writeUInt8(height >= 256 ? 0 : height, 1);
      entry.writeUInt8(0, 2); // palette
      entry.writeUInt8(0, 3); // reserved
      entry.writeUInt16LE(1, 4); // color planes
      entry.writeUInt16LE(32, 6); // bits per pixel
      entry.writeUInt32LE(buffer.length, 8); // size of image data
      entry.writeUInt32LE(offset, 12); // offset of image data
      directoryEntries.push(entry);
      offset += buffer.length;
    }

    return Buffer.concat([header, ...directoryEntries, ...pngBuffers.map(p => p.buffer)]);
  }

  const icoBuffer = createIco([
    { buffer: png16, width: 16, height: 16 },
    { buffer: png32, width: 32, height: 32 }
  ]);

  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  console.log('Generated favicon.ico in public/ and app/');
}

run().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});

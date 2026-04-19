/* eslint-disable */
// One-shot placeholder icon generator. Phase 6 replaces these with branded icons.
const sharp = require('sharp');

const sage = '#eef3e8';
const forest = '#2d5a27';

async function makeIcon(size, filename, maskable = false) {
  // Simple solid forest square with centered Lora-style "B" in sage.
  // Maskable variant: add 10% safe padding so the "B" survives circular masks.
  const pad = maskable ? Math.floor(size * 0.1) : 0;
  const inner = size - pad * 2;
  const fontSize = Math.floor(inner * 0.6);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${forest}"/>
      <text x="50%" y="50%"
            text-anchor="middle" dominant-baseline="central"
            font-family="Georgia, Lora, serif" font-weight="700"
            font-size="${fontSize}" fill="${sage}">B</text>
    </svg>
  `;
  await sharp(Buffer.from(svg)).png().toFile(filename);
  console.log(`wrote ${filename}`);
}

(async () => {
  await makeIcon(192, 'public/icons/icon-192.png', false);
  await makeIcon(512, 'public/icons/icon-512.png', false);
  await makeIcon(512, 'public/icons/icon-maskable.png', true);
})().catch((e) => { console.error(e); process.exit(1); });

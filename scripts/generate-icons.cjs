// Generates branded PWA icons for Barterkin.
// Source SVG: sprout-leaf mark in forest (#2d5a27) on sage-bg (#eef3e8) circle.
// Maskable safe zone: 15% padding per UI-SPEC §PWA install prompt polish item 1.
// Outputs: public/icons/icon-{192,512}.png, public/icons/icon-maskable.png (512),
//          app/apple-icon.png (180 — iOS Safari Add-to-Home-Screen).

/* eslint-disable */
const sharp = require('sharp')

const FOREST = '#2d5a27'
const SAGE_BG = '#eef3e8'

function brandedSvg(size, maskable = false) {
  // Maskable: 15% safe zone so Android circular/squircle masks don't clip the mark.
  const pad = maskable ? Math.floor(size * 0.15) : Math.floor(size * 0.05)
  const inner = size - pad * 2
  const cx = size / 2
  const cy = size / 2
  // Sprout/leaf path — stylized two-leaf + stem in forest.
  // Coordinates are anchored around the inner square centered at (cx, cy).
  const stemWidth = Math.max(2, Math.floor(inner * 0.04))
  const leafRadiusX = inner * 0.28
  const leafRadiusY = inner * 0.18
  const stemTop = cy - inner * 0.05
  const stemBottom = cy + inner * 0.35
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${SAGE_BG}"/>
      <circle cx="${cx}" cy="${cy}" r="${inner / 2}" fill="${SAGE_BG}"/>
      <g fill="${FOREST}">
        <!-- left leaf -->
        <ellipse
          cx="${cx - leafRadiusX * 0.6}"
          cy="${cy - inner * 0.08}"
          rx="${leafRadiusX}"
          ry="${leafRadiusY}"
          transform="rotate(-35 ${cx - leafRadiusX * 0.6} ${cy - inner * 0.08})"
        />
        <!-- right leaf -->
        <ellipse
          cx="${cx + leafRadiusX * 0.6}"
          cy="${cy - inner * 0.08}"
          rx="${leafRadiusX}"
          ry="${leafRadiusY}"
          transform="rotate(35 ${cx + leafRadiusX * 0.6} ${cy - inner * 0.08})"
        />
        <!-- stem -->
        <rect
          x="${cx - stemWidth / 2}"
          y="${stemTop}"
          width="${stemWidth}"
          height="${stemBottom - stemTop}"
          rx="${stemWidth / 2}"
        />
      </g>
    </svg>
  `
}

async function makeIcon(size, filename, maskable = false) {
  const svg = brandedSvg(size, maskable)
  await sharp(Buffer.from(svg)).png().toFile(filename)
  console.log(`wrote ${filename}`)
}

;(async () => {
  await makeIcon(192, 'public/icons/icon-192.png', false)
  await makeIcon(512, 'public/icons/icon-512.png', false)
  await makeIcon(512, 'public/icons/icon-maskable.png', true)
  await makeIcon(180, 'app/apple-icon.png', false)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})

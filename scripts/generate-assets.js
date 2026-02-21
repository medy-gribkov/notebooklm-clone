/**
 * Generate favicon and OG image assets from the DocChat logo.
 *
 * This creates simple SVG-based assets. For production, replace with
 * high-quality raster images.
 *
 * Run: node scripts/generate-assets.js
 *
 * Note: This generates SVG favicon. For PNG favicons, use an online
 * converter or install sharp: npm i -D sharp && node scripts/generate-assets.js
 */

const fs = require("fs");
const path = require("path");

const publicDir = path.join(__dirname, "..", "public");

// SVG favicon (works in all modern browsers)
const faviconSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect x="4" y="2" width="18" height="24" rx="3" fill="#e8e2f0" stroke="#4a5ebd" stroke-width="1.5"/>
  <path d="M16 2v6a2 2 0 002 2h4" stroke="#4a5ebd" stroke-width="1.5" stroke-linecap="round"/>
  <rect x="12" y="14" width="18" height="14" rx="3" fill="#4a5ebd"/>
  <circle cx="18" cy="21" r="1" fill="white"/>
  <circle cx="21" cy="21" r="1" fill="white"/>
  <circle cx="24" cy="21" r="1" fill="white"/>
</svg>`;

// Write SVG favicon
fs.writeFileSync(path.join(publicDir, "favicon.svg"), faviconSVG);
console.log("Created favicon.svg");

// Simple OG image as SVG (1200x630)
const ogSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f0ecff"/>
      <stop offset="100%" style="stop-color:#e0e8ff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Logo icon scaled up -->
  <g transform="translate(450, 160) scale(4)">
    <rect x="4" y="2" width="18" height="24" rx="3" fill="#e8e2f0" stroke="#4a5ebd" stroke-width="1.5"/>
    <path d="M16 2v6a2 2 0 002 2h4" stroke="#4a5ebd" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="12" y="14" width="18" height="14" rx="3" fill="#4a5ebd"/>
    <circle cx="18" cy="21" r="1" fill="white"/>
    <circle cx="21" cy="21" r="1" fill="white"/>
    <circle cx="24" cy="21" r="1" fill="white"/>
  </g>

  <!-- Text -->
  <text x="600" y="440" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="600" fill="#1a1a2e">
    <tspan>Doc</tspan><tspan fill="#4a5ebd">Chat</tspan>
  </text>
  <text x="600" y="490" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="#666">
    Upload documents. Ask questions. Get AI-powered answers.
  </text>

  <!-- Author -->
  <text x="600" y="580" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#999">
    by Mahdy Gribkov
  </text>
</svg>`;

fs.writeFileSync(path.join(publicDir, "og-image.svg"), ogSVG);
console.log("Created og-image.svg");

// For browsers that need PNG, we create minimal 1x1 placeholders
// and document how to convert properly
console.log("");
console.log("SVG assets created. For PNG conversion:");
console.log("  1. Open favicon.svg in browser, screenshot at 32x32 and 16x16");
console.log("  2. Or use: npx svg2png favicon.svg --width 32 --output favicon-32x32.png");
console.log("  3. Or install sharp and uncomment the conversion code below");
console.log("");

// Try sharp if available
try {
  const sharp = require("sharp");

  const svgBuffer = Buffer.from(faviconSVG);

  Promise.all([
    sharp(svgBuffer).resize(32, 32).png().toFile(path.join(publicDir, "favicon-32x32.png")),
    sharp(svgBuffer).resize(16, 16).png().toFile(path.join(publicDir, "favicon-16x16.png")),
    sharp(svgBuffer).resize(180, 180).png().toFile(path.join(publicDir, "apple-touch-icon.png")),
    sharp(Buffer.from(ogSVG)).resize(1200, 630).png().toFile(path.join(publicDir, "og-image.png")),
  ]).then(() => {
    console.log("PNG assets generated via sharp!");
  }).catch((err) => {
    console.error("Sharp conversion failed:", err.message);
  });
} catch {
  console.log("sharp not installed. Install with: npm i -D sharp");
  console.log("Then re-run this script to generate PNG favicons.");
}

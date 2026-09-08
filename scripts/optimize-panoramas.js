// Resizes raw 8000×4000 Insta360 JPGs to 6144×3072 progressive JPEGs for web.
// Usage: node scripts/optimize-panoramas.js <input-dir> <output-dir>

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const [, , INPUT_DIR, OUTPUT_DIR] = process.argv;

if (!INPUT_DIR || !OUTPUT_DIR) {
  console.error('Usage: node scripts/optimize-panoramas.js <input-dir> <output-dir>');
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const files = fs.readdirSync(INPUT_DIR).filter((f) => /\.(jpg|jpeg)$/i.test(f));

if (files.length === 0) {
  console.error('No JPG files found in', INPUT_DIR);
  process.exit(1);
}

(async () => {
  for (const file of files) {
    const input = path.join(INPUT_DIR, file);
    const output = path.join(OUTPUT_DIR, file);
    process.stdout.write(`  ${file} → `);
    const info = await sharp(input)
      .resize(6144, 3072, { fit: 'fill' })
      .jpeg({ quality: 92, progressive: true, mozjpeg: true })
      .toFile(output);
    console.log(`${(info.size / 1024 / 1024).toFixed(1)}MB`);
  }
  console.log(`\nDone. ${files.length} images written to ${OUTPUT_DIR}`);
})();

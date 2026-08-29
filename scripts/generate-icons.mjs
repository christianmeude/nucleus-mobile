#!/usr/bin/env node
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'assets/images/nucleus-mark.png');
const OUT = 1024;
// Mark occupies ~68% of canvas side (fits adaptive 66% circle with margin)
const MARK_SIZE = Math.round(OUT * 0.68);

async function build({ outPath, background, label }) {
  const resized = await sharp(src).resize(MARK_SIZE, MARK_SIZE, { fit: 'inside' }).toBuffer();
  const { width, height } = await sharp(resized).metadata();
  // center on OUT x OUT canvas
  await sharp({ create: { width: OUT, height: OUT, channels: 4, background } })
    .composite([
      { input: resized, left: Math.round((OUT - width) / 2), top: Math.round((OUT - height) / 2) },
    ])
    .png()
    .toFile(outPath);
  console.log(`${label}: ${outPath} (${OUT}×${OUT}, mark ~${MARK_SIZE})`);
}

await build({
  outPath: path.join(root, 'assets/icon.png'),
  background: { r: 255, g: 255, b: 255, alpha: 1 },
  label: 'icon',
});
await build({
  outPath: path.join(root, 'assets/adaptive-icon.png'),
  background: { r: 255, g: 255, b: 255, alpha: 0 },
  label: 'adaptive-icon',
});
await build({
  outPath: path.join(root, 'assets/splash-icon.png'),
  background: { r: 255, g: 255, b: 255, alpha: 1 },
  label: 'splash-icon',
});
await build({
  outPath: path.join(root, 'assets/favicon.png'),
  background: { r: 255, g: 255, b: 255, alpha: 1 },
  label: 'favicon',
});
console.log('done');

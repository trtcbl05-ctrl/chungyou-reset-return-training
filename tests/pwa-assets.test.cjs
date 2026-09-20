const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(projectRoot, 'public', 'manifest.webmanifest');
const layoutPath = path.join(projectRoot, 'app', 'layout.tsx');

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${filePath} must be a PNG`);
  assert.equal(buffer.toString('ascii', 12, 16), 'IHDR', `${filePath} must contain an IHDR chunk`);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.equal(manifest.theme_color, '#0B1B35');
assert.equal(manifest.background_color, '#071329');

const icon192 = manifest.icons.find((icon) => icon.src === '/icons/icon-192.png');
const icon512 = manifest.icons.find((icon) => icon.src === '/icons/icon-512.png');
const maskableIcon = manifest.icons.find((icon) => icon.src === '/icons/icon-512-maskable.png');
assert.equal(icon192.sizes, '192x192');
assert.equal(icon512.sizes, '512x512');
assert.equal(icon512.purpose, 'any maskable');
assert.equal(maskableIcon.purpose, 'maskable');

const sizes = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-512-maskable.png', 512],
  ['apple-touch-icon-180.png', 180],
];
for (const [name, expectedSize] of sizes) {
  const actual = readPngSize(path.join(projectRoot, 'public', 'icons', name));
  assert.deepEqual(actual, { width: expectedSize, height: expectedSize }, `${name} must be ${expectedSize}x${expectedSize}`);
}

const layout = fs.readFileSync(layoutPath, 'utf8');
assert.match(layout, /manifest\.webmanifest/);
assert.match(layout, /apple-touch-icon-180\.png/);
assert.match(layout, /themeColor/);

console.log('PWA asset checks passed');

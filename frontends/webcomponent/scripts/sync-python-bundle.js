/** Copy the version-matched browser bundle into the Python package. */

const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '../dist/vanna-components.js');
const packageBundlePath = path.join(
  __dirname,
  '../../../src/vanna/web_components/vanna-components.js',
);

if (!fs.existsSync(bundlePath)) {
  throw new Error(`WebComponent bundle does not exist: ${bundlePath}`);
}

fs.copyFileSync(bundlePath, packageBundlePath);
console.log(`✓ Python WebComponent bundle synced: ${packageBundlePath}`);

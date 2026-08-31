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

const bundle = fs.readFileSync(bundlePath, 'utf8');
// Lit's minified parser contains literal tab/newline/form-feed/carriage-return
// sequences inside template strings. Escape that exact sequence so the packaged
// source remains semantically identical without introducing trailing whitespace.
const packageBundle = bundle.replaceAll('\t\n\\f\\r', '\\t\\n\\f\\r');
fs.writeFileSync(packageBundlePath, packageBundle, 'utf8');
console.log(`✓ Python WebComponent bundle synced: ${packageBundlePath}`);

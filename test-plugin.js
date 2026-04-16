// Simulate what the plugin does to the Podfile
const fs = require('fs');
const path = require('path');

const MARKER = '# [AMSMB2-SPM]';
const PKG_UUID  = 'CC000001CC000001CC000001';
const DEP_UUID  = 'CC000002CC000002CC000002';
const FILE_UUID = 'CC000003CC000003CC000003';

// Read the plugin source and extract RUBY_HOOK by evaluating it
const src = fs.readFileSync('./plugins/withAMSMB2Pod.js', 'utf8');

// The plugin uses template literals. Let's evaluate the file to extract RUBY_HOOK
// by mocking withDangerousMod to capture what gets written
let capturedContent = null;
const fakeFs = {
  readFileSync: () => '# fake existing podfile\n',
  writeFileSync: (p, c) => { capturedContent = c; }
};

// Create a sandboxed version
const modSrc = src
  .replace("require('@expo/config-plugins')", "{ withDangerousMod: (c, [plat, fn]) => { fn(c); return c; } }")
  .replace("require('fs')", JSON.stringify(fakeFs))
  .replace("require('path')", "{ join: (...a) => a.join('/') }");

try {
  eval(modSrc + '\n module.exports({ modRequest: { platformProjectRoot: "/fake/ios" } });');
} catch(e) {
  // ignore - the module.exports call will fail
}

if (capturedContent) {
  const hookStart = capturedContent.indexOf(MARKER);
  if (hookStart >= 0) {
    console.log("=== RUBY HOOK CONTENT ===");
    console.log(capturedContent.slice(hookStart));
  }
} else {
  console.log("No content captured - trying different approach");
  // Just print the raw template literal by parsing the file
  const hookMatch = src.match(/const RUBY_HOOK = `([\s\S]*?)`;[\s\n]*module\.exports/);
  if (hookMatch) {
    // Manually substitute the JS template variables
    let hook = hookMatch[1]
      .replace(/\$\{MARKER\}/g, MARKER)
      .replace(/\$\{PKG_UUID\}/g, PKG_UUID)
      .replace(/\$\{DEP_UUID\}/g, DEP_UUID)
      .replace(/\$\{FILE_UUID\}/g, FILE_UUID);
    console.log("=== RUBY HOOK CONTENT (raw template) ===");
    console.log(JSON.stringify(hook));
  }
}

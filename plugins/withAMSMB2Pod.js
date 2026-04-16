const { withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const MARKER = '# [AMSMB2-SPM]';

// TEST: just append a comment to confirm withDangerousMod works at all
const RUBY_HOOK = `

${MARKER}
# AMSMB2 SPM integration placeholder - post_install hook removed for test
`;

module.exports = function withAMSMB2(config) {
  return withDangerousMod(config, ['ios', (config) => {
    const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
    if (!fs.existsSync(podfilePath)) {
      console.warn('[withAMSMB2] Podfile not found, skipping');
      return config;
    }
    let podfile = fs.readFileSync(podfilePath, 'utf8');
    if (podfile.includes(MARKER)) return config;
    fs.writeFileSync(podfilePath, podfile + RUBY_HOOK);
    return config;
  }]);
};
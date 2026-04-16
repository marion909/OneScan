const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds AMSMB2 pod to the iOS Podfile for SMB2 support.
 */
module.exports = function withAMSMB2Pod(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      if (!podfile.includes("pod 'AMSMB2'")) {
        // Insert before the last 'end' in the main target block
        podfile = podfile.replace(
          /(^\s*use_expo_modules!\s*$)/m,
          "$1\n  pod 'AMSMB2', '~> 3.0'"
        );
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
};

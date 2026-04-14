const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds ProGuard rules to keep SMBJ classes from being obfuscated/removed.
 */
module.exports = function withSmbProguard(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const projectRoot = config.modRequest.platformProjectRoot;
      const proguardFile = path.join(projectRoot, 'app', 'proguard-rules.pro');

      const rules = [
        '',
        '# SMBJ - SMB2/SMB3 library',
        '-keep class com.hierynomus.** { *; }',
        '-keepclassmembers class com.hierynomus.** { *; }',
        '-keep class net.engio.** { *; }',
        '-dontwarn com.hierynomus.**',
        '-dontwarn net.engio.**',
        '-dontwarn org.slf4j.**',
        '-dontwarn org.bouncycastle.**',
        '',
      ].join('\n');

      if (fs.existsSync(proguardFile)) {
        const existing = fs.readFileSync(proguardFile, 'utf8');
        if (!existing.includes('SMBJ')) {
          fs.appendFileSync(proguardFile, rules);
        }
      }

      return config;
    },
  ]);
};

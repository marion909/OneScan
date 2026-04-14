const { withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Writes a dedicated proguard-smb-rules.pro file and wires it into app/build.gradle.
 * More reliable than expo-build-properties extraProguardRules for local modules.
 */
module.exports = function withSmbProguard(config) {
  // Step 1: Write proguard-smb-rules.pro
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const rulesPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-smb-rules.pro'
      );
      const rules = [
        '-keep class expo.modules.smbwriter.** { *; }',
        '-keepclassmembers class expo.modules.smbwriter.** { *; }',
        '-keep class expo.modules.documentdetector.** { *; }',
        '-keepclassmembers class expo.modules.documentdetector.** { *; }',
      ].join('\n');
      fs.writeFileSync(rulesPath, rules);
      return config;
    },
  ]);

  // Step 2: Reference the file in app/build.gradle release block
  config = withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes('proguard-smb-rules.pro')) {
      config.modResults.contents = contents.replace(
        /proguardFiles getDefaultProguardFile\('proguard-android-optimize\.txt'\), 'proguard-rules\.pro'/g,
        "proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro', 'proguard-smb-rules.pro'"
      );
    }
    return config;
  });

  return config;
};

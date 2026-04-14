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
        // SMBJ and its dependencies
        '-keep class com.hierynomus.** { *; }',
        '-keepclassmembers class com.hierynomus.** { *; }',
        '-keep class net.engio.** { *; }',
        '-dontwarn com.hierynomus.**',
        '-dontwarn net.engio.**',
        '-dontwarn org.slf4j.**',
      ].join('\n');
      fs.writeFileSync(rulesPath, rules);
      return config;
    },
  ]);

  // Step 2: Reference the file in app/build.gradle release block
  config = withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes('proguard-smb-rules.pro')) {
      // Match any proguardFiles line in the release block regardless of quotes/filename variant
      config.modResults.contents = contents.replace(
        /(proguardFiles\s[^\n]+proguard-rules\.pro[^\n]*)/,
        "$1, 'proguard-smb-rules.pro'"
      );
    }
    return config;
  });

  return config;
};

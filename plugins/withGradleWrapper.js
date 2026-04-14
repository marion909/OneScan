const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Pins the Gradle wrapper distribution to a version pre-cached on EAS build workers.
 * Must use withDangerousMod to edit gradle/wrapper/gradle-wrapper.properties,
 * NOT withGradleProperties (which only edits android/gradle.properties).
 */
module.exports = function withGradleWrapper(config, { gradleVersion = '8.10.2' } = {}) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const wrapperPropsPath = path.join(
        config.modRequest.platformProjectRoot,
        'gradle', 'wrapper', 'gradle-wrapper.properties'
      );

      if (fs.existsSync(wrapperPropsPath)) {
        let contents = fs.readFileSync(wrapperPropsPath, 'utf8');
        contents = contents.replace(
          /^distributionUrl=.*$/m,
          `distributionUrl=https\\://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip`
        );
        fs.writeFileSync(wrapperPropsPath, contents);
      }

      return config;
    },
  ]);
};

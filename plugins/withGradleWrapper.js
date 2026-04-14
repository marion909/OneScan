const { withGradleProperties } = require('@expo/config-plugins');

/**
 * Pins the Gradle distribution to a version known to be available on EAS build workers.
 */
module.exports = function withGradleWrapper(config, { gradleVersion = '8.10.2' } = {}) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;

    const urlKey = 'distributionUrl';
    const idx = props.findIndex((p) => p.type === 'property' && p.key === urlKey);
    const newUrl = `https\\://services.gradle.org/distributions/gradle-${gradleVersion}-bin.zip`;

    if (idx !== -1) {
      props[idx].value = newUrl;
    } else {
      props.push({ type: 'property', key: urlKey, value: newUrl });
    }

    return config;
  });
};

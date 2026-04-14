const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Redirects Gradle subproject build directories to C:/tmp/gradle/<name>
 * to avoid Windows MAX_PATH (260 char) limitations caused by bun's long
 * package store paths (node_modules/.bun/<package>@<version>+<hash>/...).
 * Only needed for local builds — EAS runs on Linux where this isn't an issue.
 */
module.exports = function withShortBuildDirs(config) {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('C:/tmp/gradle')) {
      config.modResults.contents += `
// Shorten subproject build dirs to avoid Windows MAX_PATH (260 char) limit
// Exclude ':app' since its generated sources (PackageList.kt) must stay in standard location
subprojects {
    if (project.name != 'app') {
        buildDir = new File("C:/tmp/gradle/\${rootProject.name}/\${project.name}")
    }
}
`;
    }
    return config;
  });
};

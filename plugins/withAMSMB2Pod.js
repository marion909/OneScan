const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Adds AMSMB2 as a Swift Package Manager dependency to the Xcode project.
 */
module.exports = function withAMSMB2Pod(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;

    const AMSMB2_URL = 'https://github.com/amosavian/AMSMB2';
    const AMSMB2_VERSION = '4.0.3';

    // Check if already added
    const packages = xcodeProject.hash.project.objects['XCRemoteSwiftPackageReference'] || {};
    const alreadyAdded = Object.values(packages).some(
      (pkg) => typeof pkg === 'object' && pkg.repositoryURL === AMSMB2_URL
    );

    if (!alreadyAdded) {
      // Add remote Swift package reference
      const packageRefId = xcodeProject.generateUuid();
      xcodeProject.hash.project.objects['XCRemoteSwiftPackageReference'] =
        xcodeProject.hash.project.objects['XCRemoteSwiftPackageReference'] || {};
      xcodeProject.hash.project.objects['XCRemoteSwiftPackageReference'][packageRefId] = {
        isa: 'XCRemoteSwiftPackageReference',
        repositoryURL: AMSMB2_URL,
        requirement: {
          kind: 'exactVersion',
          version: AMSMB2_VERSION,
        },
      };

      // Add product dependency
      const productDepId = xcodeProject.generateUuid();
      xcodeProject.hash.project.objects['XCSwiftPackageProductDependency'] =
        xcodeProject.hash.project.objects['XCSwiftPackageProductDependency'] || {};
      xcodeProject.hash.project.objects['XCSwiftPackageProductDependency'][productDepId] = {
        isa: 'XCSwiftPackageProductDependency',
        package: packageRefId,
        productName: 'AMSMB2',
      };

      // Add to main app target's packageDependencies
      const targets = xcodeProject.hash.project.objects['PBXNativeTarget'] || {};
      for (const [, target] of Object.entries(targets)) {
        if (typeof target === 'object' && target.name === config.modRequest.projectName) {
          target.packageProductDependencies = target.packageProductDependencies || [];
          target.packageProductDependencies.push(productDepId);

          // Add build phase entry (PBXBuildFile)
          const buildFileId = xcodeProject.generateUuid();
          xcodeProject.hash.project.objects['PBXBuildFile'] =
            xcodeProject.hash.project.objects['PBXBuildFile'] || {};
          xcodeProject.hash.project.objects['PBXBuildFile'][buildFileId] = {
            isa: 'PBXBuildFile',
            productRef: productDepId,
          };

          // Add to Frameworks build phase
          const buildPhases = xcodeProject.hash.project.objects['PBXFrameworksBuildPhase'] || {};
          for (const [, phase] of Object.entries(buildPhases)) {
            if (typeof phase === 'object' && Array.isArray(phase.files)) {
              phase.files.push(buildFileId);
              break;
            }
          }
          break;
        }
      }

      // Add to project-level packages list
      const project = xcodeProject.hash.project.objects['PBXProject'];
      for (const [, proj] of Object.entries(project || {})) {
        if (typeof proj === 'object') {
          proj.packages = proj.packages || [];
          proj.packages.push(packageRefId);
          break;
        }
      }
    }

    return config;
  });
};

const { withXcodeProject } = require('@expo/config-plugins');

const AMSMB2_URL = 'https://github.com/amosavian/AMSMB2';
const AMSMB2_VERSION = '4.0.3';
const PRODUCT_NAME = 'AMSMB2';

/**
 * Adds AMSMB2 as a Swift Package Manager dependency to the Xcode project.
 *
 * The xcode npm package requires:
 *  - repositoryURL to be a quoted string: '"https://..."'
 *  - array entries as { value, comment } objects (not plain UUID strings)
 *  - _comment sibling keys for human-readable labels in the pbxproj file
 */
module.exports = function withAMSMB2Pod(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const objects = xcodeProject.hash.project.objects;

    // Idempotency: skip if already added
    const existingRefs = objects['XCRemoteSwiftPackageReference'] || {};
    const alreadyAdded = Object.values(existingRefs).some(
      (v) => typeof v === 'object' && v.repositoryURL === `"${AMSMB2_URL}"`
    );
    if (alreadyAdded) return config;

    const pkgRefId  = xcodeProject.generateUuid();
    const prodDepId = xcodeProject.generateUuid();
    const bfId      = xcodeProject.generateUuid();

    // ── 1. XCRemoteSwiftPackageReference ──────────────────────────────────────
    objects['XCRemoteSwiftPackageReference'] = objects['XCRemoteSwiftPackageReference'] || {};
    objects['XCRemoteSwiftPackageReference'][pkgRefId] = {
      isa: 'XCRemoteSwiftPackageReference',
      repositoryURL: `"${AMSMB2_URL}"`,
      requirement: { kind: 'exactVersion', version: AMSMB2_VERSION },
    };
    objects['XCRemoteSwiftPackageReference'][`${pkgRefId}_comment`] =
      `XCRemoteSwiftPackageReference "${PRODUCT_NAME}"`;

    // ── 2. XCSwiftPackageProductDependency ────────────────────────────────────
    objects['XCSwiftPackageProductDependency'] = objects['XCSwiftPackageProductDependency'] || {};
    objects['XCSwiftPackageProductDependency'][prodDepId] = {
      isa: 'XCSwiftPackageProductDependency',
      package: pkgRefId,
      package_comment: `XCRemoteSwiftPackageReference "${PRODUCT_NAME}"`,
      productName: PRODUCT_NAME,
    };
    objects['XCSwiftPackageProductDependency'][`${prodDepId}_comment`] = PRODUCT_NAME;

    // ── 3. PBXBuildFile ───────────────────────────────────────────────────────
    objects['PBXBuildFile'] = objects['PBXBuildFile'] || {};
    objects['PBXBuildFile'][bfId] = {
      isa: 'PBXBuildFile',
      productRef: prodDepId,
      productRef_comment: PRODUCT_NAME,
    };
    objects['PBXBuildFile'][`${bfId}_comment`] = `${PRODUCT_NAME} in Frameworks`;

    // ── 4. PBXProject.packages ────────────────────────────────────────────────
    for (const key of Object.keys(objects['PBXProject'] || {})) {
      if (key.endsWith('_comment')) continue;
      const proj = objects['PBXProject'][key];
      if (!proj.packages) proj.packages = [];
      proj.packages.push({
        value: pkgRefId,
        comment: `XCRemoteSwiftPackageReference "${PRODUCT_NAME}"`,
      });
    }

    // ── 5. PBXNativeTarget.packageProductDependencies (app target only) ───────
    for (const key of Object.keys(objects['PBXNativeTarget'] || {})) {
      if (key.endsWith('_comment')) continue;
      const target = objects['PBXNativeTarget'][key];
      if (target.productType === '"com.apple.product-type.application"') {
        if (!target.packageProductDependencies) target.packageProductDependencies = [];
        target.packageProductDependencies.push({ value: prodDepId, comment: PRODUCT_NAME });
      }
    }

    // ── 6. PBXFrameworksBuildPhase.files ──────────────────────────────────────
    for (const key of Object.keys(objects['PBXFrameworksBuildPhase'] || {})) {
      if (key.endsWith('_comment')) continue;
      const phase = objects['PBXFrameworksBuildPhase'][key];
      if (Array.isArray(phase.files)) {
        phase.files.push({ value: bfId, comment: `${PRODUCT_NAME} in Frameworks` });
      }
    }

    return config;
  });
};

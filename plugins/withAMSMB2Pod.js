const { withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const REPO_URL  = 'https://github.com/amosavian/AMSMB2';
const VERSION   = '4.0.3';
const PRODUCT   = 'AMSMB2';
// Fixed UUIDs – won't collide with generated 24-char uppercase UUIDs
const PKG_UUID  = 'CC000001CC000001CC000001';
const DEP_UUID  = 'CC000002CC000002CC000002';
const FILE_UUID = 'CC000003CC000003CC000003';

function escRE(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

/** Returns [start, end] of the brace-balanced block where s[start] === '{' */
function bracedBlock(s, start) {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}' && --depth === 0) return [start, i + 1];
  }
  return [start, s.length];
}

module.exports = function withAMSMB2(config) {
  return withDangerousMod(config, ['ios', (config) => {
    const root = config.modRequest.platformProjectRoot;
    const name = config.modRequest.projectName;
    const pbxPath = path.join(root, `${name}.xcodeproj`, 'project.pbxproj');

    let s = fs.readFileSync(pbxPath, 'utf8');
    if (s.includes(PKG_UUID)) return config; // idempotent

    // ── 1. PBXBuildFile ──────────────────────────────────────────────────────
    s = s.replace(
      '/* End PBXBuildFile section */',
      `\t\t${FILE_UUID} /* ${PRODUCT} in Frameworks */ = {isa = PBXBuildFile; productRef = ${DEP_UUID} /* ${PRODUCT} */; };\n` +
      `/* End PBXBuildFile section */`
    );

    // ── 2. XCRemoteSwiftPackageReference section ─────────────────────────────
    const pkgBlock =
      `\t\t${PKG_UUID} /* XCRemoteSwiftPackageReference "${PRODUCT}" */ = {\n` +
      `\t\t\tisa = XCRemoteSwiftPackageReference;\n` +
      `\t\t\trepositoryURL = "${REPO_URL}";\n` +
      `\t\t\trequirement = {\n` +
      `\t\t\t\tkind = exactVersion;\n` +
      `\t\t\t\tversion = ${VERSION};\n` +
      `\t\t\t};\n` +
      `\t\t};`;

    if (s.includes('/* End XCRemoteSwiftPackageReference section */')) {
      s = s.replace(
        '/* End XCRemoteSwiftPackageReference section */',
        `${pkgBlock}\n/* End XCRemoteSwiftPackageReference section */`
      );
    } else {
      s = s.replace(
        '/* End PBXProject section */',
        `/* End PBXProject section */\n\n` +
        `/* Begin XCRemoteSwiftPackageReference section */\n${pkgBlock}\n` +
        `/* End XCRemoteSwiftPackageReference section */`
      );
    }

    // ── 3. XCSwiftPackageProductDependency section ───────────────────────────
    const depBlock =
      `\t\t${DEP_UUID} /* ${PRODUCT} */ = {\n` +
      `\t\t\tisa = XCSwiftPackageProductDependency;\n` +
      `\t\t\tpackage = ${PKG_UUID} /* XCRemoteSwiftPackageReference "${PRODUCT}" */;\n` +
      `\t\t\tproductName = ${PRODUCT};\n` +
      `\t\t};`;

    if (s.includes('/* End XCSwiftPackageProductDependency section */')) {
      s = s.replace(
        '/* End XCSwiftPackageProductDependency section */',
        `${depBlock}\n/* End XCSwiftPackageProductDependency section */`
      );
    } else {
      s = s.replace(
        '/* End XCRemoteSwiftPackageReference section */',
        `/* End XCRemoteSwiftPackageReference section */\n\n` +
        `/* Begin XCSwiftPackageProductDependency section */\n${depBlock}\n` +
        `/* End XCSwiftPackageProductDependency section */`
      );
    }

    // ── Locate the app target ────────────────────────────────────────────────
    const targetMarkerRE = new RegExp(`([0-9A-F]{24}) /\\* ${escRE(name)} \\*/ = \\{`);
    const targetMatch = s.match(targetMarkerRE);
    if (!targetMatch) { fs.writeFileSync(pbxPath, s); return config; }

    const targetHeadPos  = s.indexOf(targetMatch[0]);
    const targetBracePos = s.indexOf('{', targetHeadPos);
    const [, targetEnd0] = bracedBlock(s, targetBracePos);
    const targetBlock0   = s.slice(targetHeadPos, targetEnd0);

    // Frameworks build phase UUID (from target's buildPhases list)
    const fwMatch = targetBlock0.match(/([0-9A-F]{24}) \/\* Frameworks \*\//i);
    const fwUUID  = fwMatch ? fwMatch[1] : null;

    // ── 4. PBXFrameworksBuildPhase.files ─────────────────────────────────────
    if (fwUUID) {
      s = s.replace(
        new RegExp(`(${escRE(fwUUID)} /\\* Frameworks \\*/ = \\{[\\s\\S]*?files = \\()`),
        `$1\n\t\t\t\t${FILE_UUID} /* ${PRODUCT} in Frameworks */,`
      );
    }

    // ── 5. PBXNativeTarget.packageProductDependencies ────────────────────────
    // Re-locate after step 4 may have shifted offsets
    const tbStart = s.indexOf(targetMatch[0]);
    const tbBrace = s.indexOf('{', tbStart);
    const [, tbEnd] = bracedBlock(s, tbBrace);
    let tb = s.slice(tbStart, tbEnd);

    if (tb.includes('packageProductDependencies = (')) {
      tb = tb.replace(
        'packageProductDependencies = (',
        `packageProductDependencies = (\n\t\t\t\t${DEP_UUID} /* ${PRODUCT} */,`
      );
    } else {
      // Insert before the productType line
      tb = tb.replace(
        /([ \t]+productType = [^\n]+;\n)/,
        `\t\t\tpackageProductDependencies = (\n\t\t\t\t${DEP_UUID} /* ${PRODUCT} */,\n\t\t\t);\n$1`
      );
    }
    s = s.slice(0, tbStart) + tb + s.slice(tbEnd);

    // ── 6. PBXProject.packages ───────────────────────────────────────────────
    const projISAIdx = s.indexOf('isa = PBXProject;');
    if (projISAIdx !== -1) {
      const projBrace = s.lastIndexOf('{', projISAIdx);
      const [, projEnd] = bracedBlock(s, projBrace);
      let pb = s.slice(projBrace, projEnd);

      const pkgEntry = `\n\t\t\t\t${PKG_UUID} /* XCRemoteSwiftPackageReference "${PRODUCT}" */,`;
      if (pb.includes('packages = (')) {
        pb = pb.replace('packages = (', `packages = (${pkgEntry}`);
      } else if (pb.includes('packageReferences = (')) {
        pb = pb.replace('packageReferences = (', `packageReferences = (${pkgEntry}`);
      } else {
        // No packages array at all – add one before targets = (
        pb = pb.replace(
          /([ \t]+targets = \()/,
          `\t\t\tpackages = (${pkgEntry}\n\t\t\t);\n$1`
        );
      }
      s = s.slice(0, projBrace) + pb + s.slice(projEnd);
    }

    fs.writeFileSync(pbxPath, s);
    return config;
  }]);
};

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

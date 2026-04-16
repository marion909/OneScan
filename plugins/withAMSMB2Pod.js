const { withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const REPO_URL  = 'https://github.com/amosavian/AMSMB2';
const VERSION   = '4.0.3';
const PRODUCT   = 'AMSMB2';
const PKG_UUID  = 'CC000001CC000001CC000001';
const DEP_UUID  = 'CC000002CC000002CC000002';
const FILE_UUID = 'CC000003CC000003CC000003';

function escRE(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

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
    if (s.includes(PKG_UUID)) return config;

    // 1. PBXBuildFile
    s = s.replace(
      '/* End PBXBuildFile section */',
      `\t\t${FILE_UUID} /* ${PRODUCT} in Frameworks */ = {isa = PBXBuildFile; productRef = ${DEP_UUID} /* ${PRODUCT} */; };\n/* End PBXBuildFile section */`
    );

    // 2. XCRemoteSwiftPackageReference section
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
      s = s.replace('/* End XCRemoteSwiftPackageReference section */',
        `${pkgBlock}\n/* End XCRemoteSwiftPackageReference section */`);
    } else {
      s = s.replace('/* End PBXProject section */',
        `/* End PBXProject section */\n\n/* Begin XCRemoteSwiftPackageReference section */\n${pkgBlock}\n/* End XCRemoteSwiftPackageReference section */`);
    }

    // 3. XCSwiftPackageProductDependency section
    const depBlock =
      `\t\t${DEP_UUID} /* ${PRODUCT} */ = {\n` +
      `\t\t\tisa = XCSwiftPackageProductDependency;\n` +
      `\t\t\tpackage = ${PKG_UUID} /* XCRemoteSwiftPackageReference "${PRODUCT}" */;\n` +
      `\t\t\tproductName = ${PRODUCT};\n` +
      `\t\t};`;

    if (s.includes('/* End XCSwiftPackageProductDependency section */')) {
      s = s.replace('/* End XCSwiftPackageProductDependency section */',
        `${depBlock}\n/* End XCSwiftPackageProductDependency section */`);
    } else {
      s = s.replace('/* End XCRemoteSwiftPackageReference section */',
        `/* End XCRemoteSwiftPackageReference section */\n\n/* Begin XCSwiftPackageProductDependency section */\n${depBlock}\n/* End XCSwiftPackageProductDependency section */`);
    }

    // Locate app target
    const targetMarkerRE = new RegExp(`([0-9A-F]{24}) /\\* ${escRE(name)} \\*/ = \\{`);
    const targetMatch = s.match(targetMarkerRE);
    if (!targetMatch) { fs.writeFileSync(pbxPath, s); return config; }

    const targetHeadPos  = s.indexOf(targetMatch[0]);
    const targetBracePos = s.indexOf('{', targetHeadPos);
    const [, targetEnd0] = bracedBlock(s, targetBracePos);
    const targetBlock0   = s.slice(targetHeadPos, targetEnd0);

    const fwMatch = targetBlock0.match(/([0-9A-F]{24}) \/\* Frameworks \*\//i);
    const fwUUID  = fwMatch ? fwMatch[1] : null;

    // 4. PBXFrameworksBuildPhase.files
    if (fwUUID) {
      s = s.replace(
        new RegExp(`(${escRE(fwUUID)} /\\* Frameworks \\*/ = \\{[\\s\\S]*?files = \\()`),
        `$1\n\t\t\t\t${FILE_UUID} /* ${PRODUCT} in Frameworks */,`
      );
    }

    // 5. PBXNativeTarget.packageProductDependencies
    const tbStart = s.indexOf(targetMatch[0]);
    const tbBrace = s.indexOf('{', tbStart);
    const [, tbEnd] = bracedBlock(s, tbBrace);
    let tb = s.slice(tbStart, tbEnd);

    if (tb.includes('packageProductDependencies = (')) {
      tb = tb.replace('packageProductDependencies = (',
        `packageProductDependencies = (\n\t\t\t\t${DEP_UUID} /* ${PRODUCT} */,`);
    } else {
      tb = tb.replace(/([ \t]+productType = [^\n]+;\n)/,
        `\t\t\tpackageProductDependencies = (\n\t\t\t\t${DEP_UUID} /* ${PRODUCT} */,\n\t\t\t);\n$1`);
    }
    s = s.slice(0, tbStart) + tb + s.slice(tbEnd);

    // 6. PBXProject.packages
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
        pb = pb.replace(/([ \t]+targets = \()/, `\t\t\tpackages = (${pkgEntry}\n\t\t\t);\n$1`);
      }
      s = s.slice(0, projBrace) + pb + s.slice(projEnd);
    }

    fs.writeFileSync(pbxPath, s);
    return config;
  }]);
};
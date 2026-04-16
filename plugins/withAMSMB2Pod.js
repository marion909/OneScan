const { withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const MARKER = '# [AMSMB2-SPM]';

// Fixed UUIDs - won't collide with 24-char CocoaPods UUIDs
const PKG_UUID  = 'CC000001CC000001CC000001';
const DEP_UUID  = 'CC000002CC000002CC000002';
const FILE_UUID = 'CC000003CC000003CC000003';

// Ruby post_install hook:
//  - Uses xcodeproj ONLY for reading (target UUID, frameworks build phase UUID)
//  - Does pure text-patching of Pods.xcodeproj/project.pbxproj for writing
//  - Avoids xcodeproj write API version compatibility issues entirely
const RUBY_HOOK = `

${MARKER}
post_install do |installer|
  smb_target = installer.pods_project.targets.find { |t| t.name == 'smb-writer' }
  next unless smb_target

  pbxproj_path = File.join(installer.pods_project.path.to_s, 'project.pbxproj')
  s = File.read(pbxproj_path)
  next if s.include?('${PKG_UUID}')

  fwb_uuid    = smb_target.frameworks_build_phase.uuid
  target_uuid = smb_target.uuid

  # 1. PBXBuildFile
  s.sub!('/* End PBXBuildFile section */',
    "\\t\\t${FILE_UUID} /* AMSMB2 in Frameworks */ = {isa = PBXBuildFile; productRef = ${DEP_UUID} /* AMSMB2 */; };\\n\\t\\t/* End PBXBuildFile section */")

  # 2. XCRemoteSwiftPackageReference section
  pkg_block = "\\t\\t${PKG_UUID} /* XCRemoteSwiftPackageReference \\"AMSMB2\\" */ = {\\n\\t\\t\\tisa = XCRemoteSwiftPackageReference;\\n\\t\\t\\trepositoryURL = \\"https://github.com/amosavian/AMSMB2\\";\\n\\t\\t\\trequirement = {\\n\\t\\t\\t\\tkind = exactVersion;\\n\\t\\t\\t\\tversion = 4.0.3;\\n\\t\\t\\t};\\n\\t\\t};"
  if s.include?('/* End XCRemoteSwiftPackageReference section */')
    s.sub!('/* End XCRemoteSwiftPackageReference section */',
      "#{pkg_block}\\n\\t\\t/* End XCRemoteSwiftPackageReference section */")
  else
    s.sub!('/* End PBXProject section */',
      "/* End PBXProject section */\\n\\n/* Begin XCRemoteSwiftPackageReference section */\\n#{pkg_block}\\n/* End XCRemoteSwiftPackageReference section */")
  end

  # 3. XCSwiftPackageProductDependency section
  dep_block = "\\t\\t${DEP_UUID} /* AMSMB2 */ = {\\n\\t\\t\\tisa = XCSwiftPackageProductDependency;\\n\\t\\t\\tpackage = ${PKG_UUID} /* XCRemoteSwiftPackageReference \\"AMSMB2\\" */;\\n\\t\\t\\tproductName = AMSMB2;\\n\\t\\t};"
  if s.include?('/* End XCSwiftPackageProductDependency section */')
    s.sub!('/* End XCSwiftPackageProductDependency section */',
      "#{dep_block}\\n\\t\\t/* End XCSwiftPackageProductDependency section */")
  else
    s.sub!('/* End XCRemoteSwiftPackageReference section */',
      "/* End XCRemoteSwiftPackageReference section */\\n\\n/* Begin XCSwiftPackageProductDependency section */\\n#{dep_block}\\n/* End XCSwiftPackageProductDependency section */")
  end

  # 4. Frameworks build phase - add FILE_UUID
  fwb_marker = "#{fwb_uuid} /* Frameworks */"
  if s.include?(fwb_marker)
    fwb_pos   = s.index(fwb_marker)
    files_pos = s.index('files = (', fwb_pos)
    s = s[0, files_pos + 'files = ('.length] +
        "\\n\\t\\t\\t\\t${FILE_UUID} /* AMSMB2 in Frameworks */," +
        s[files_pos + 'files = ('.length..]
  end

  # 5. Target - add packageProductDependencies
  target_marker = "#{target_uuid} /* smb-writer */"
  if s.include?(target_marker)
    prod_pos = s.index('productType = ', s.index(target_marker))
    if prod_pos
      line_end = s.index("\\n", prod_pos)
      s = s[0, line_end] +
          "\\n\\t\\t\\tpackageProductDependencies = (\\n\\t\\t\\t\\t${DEP_UUID} /* AMSMB2 */,\\n\\t\\t\\t);" +
          s[line_end..]
    end
  end

  # 6. PBXProject.packages list
  proj_isa_pos = s.index('isa = PBXProject;')
  if proj_isa_pos
    pkg_list_pos = s.index('packages = (', [proj_isa_pos - 3000, 0].max)
    if pkg_list_pos && pkg_list_pos < proj_isa_pos + 3000
      s = s[0, pkg_list_pos + 'packages = ('.length] +
          "\\n\\t\\t\\t\\t${PKG_UUID} /* XCRemoteSwiftPackageReference \\"AMSMB2\\" */," +
          s[pkg_list_pos + 'packages = ('.length..]
    else
      targets_pos = s.index('targets = (', proj_isa_pos)
      if targets_pos
        line_start = s.rindex("\\n", targets_pos)
        s = s[0, line_start + 1] +
            "\\t\\t\\tpackages = (\\n\\t\\t\\t\\t${PKG_UUID} /* XCRemoteSwiftPackageReference \\"AMSMB2\\" */,\\n\\t\\t\\t);\\n" +
            s[line_start + 1..]
      end
    end
  end

  File.write(pbxproj_path, s)
  puts "[AMSMB2-SPM] Successfully patched Pods.xcodeproj"
end
`;

module.exports = function withAMSMB2(config) {
  return withDangerousMod(config, ['ios', (config) => {
    const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
    let podfile = fs.readFileSync(podfilePath, 'utf8');
    if (podfile.includes(MARKER)) return config;
    fs.writeFileSync(podfilePath, podfile + RUBY_HOOK);
    return config;
  }]);
};
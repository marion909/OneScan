const { withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const MARKER = '# [AMSMB2-SPM]';
const PKG_UUID  = 'CC000001CC000001CC000001';
const DEP_UUID  = 'CC000002CC000002CC000002';
const FILE_UUID = 'CC000003CC000003CC000003';

// Injected INSIDE the existing post_install do |installer| block
// (a second post_install block causes CocoaPods to fail on this Expo version)
const AMSMB2_RUBY = `  ${MARKER}
  begin
    smb_target = installer.pods_project.targets.find { |t| t.name == 'smb-writer' }
    if smb_target
      fwb         = smb_target.frameworks_build_phase
      fwb_uuid    = fwb ? fwb.uuid : nil
      target_uuid = smb_target.uuid
      pbxproj     = File.join(installer.pods_project.path.to_s, 'project.pbxproj')
      s           = File.read(pbxproj)
      unless s.include?('${PKG_UUID}')
        s = s.sub('/* End PBXBuildFile section */',
          "\\t\\t${FILE_UUID} /* AMSMB2 in Frameworks */ = {isa = PBXBuildFile; productRef = ${DEP_UUID} /* AMSMB2 */; };\\n\\t\\t/* End PBXBuildFile section */")
        pkg_b = "\\t\\t${PKG_UUID} /* XCRemoteSwiftPackageReference \\"AMSMB2\\" */ = {\\n\\t\\t\\tisa = XCRemoteSwiftPackageReference;\\n\\t\\t\\trepositoryURL = \\"https://github.com/amosavian/AMSMB2\\";\\n\\t\\t\\trequirement = { kind = exactVersion; version = 4.0.3; };\\n\\t\\t};"
        dep_b = "\\t\\t${DEP_UUID} /* AMSMB2 */ = { isa = XCSwiftPackageProductDependency; package = ${PKG_UUID}; productName = AMSMB2; };"
        if s.include?('/* End XCRemoteSwiftPackageReference section */')
          s = s.sub('/* End XCRemoteSwiftPackageReference section */', "#{pkg_b}\\n/* End XCRemoteSwiftPackageReference section */")
        else
          s = s.sub('/* End PBXProject section */', "/* End PBXProject section */\\n/* Begin XCRemoteSwiftPackageReference section */\\n#{pkg_b}\\n/* End XCRemoteSwiftPackageReference section */")
        end
        if s.include?('/* End XCSwiftPackageProductDependency section */')
          s = s.sub('/* End XCSwiftPackageProductDependency section */', "#{dep_b}\\n/* End XCSwiftPackageProductDependency section */")
        else
          s = s.sub('/* End XCRemoteSwiftPackageReference section */', "/* End XCRemoteSwiftPackageReference section */\\n/* Begin XCSwiftPackageProductDependency section */\\n#{dep_b}\\n/* End XCSwiftPackageProductDependency section */")
        end
        if fwb_uuid && s.include?("#{fwb_uuid} /* Frameworks */")
          fp = s.index('files = (', s.index("#{fwb_uuid} /* Frameworks */"))
          s = s[0, fp + 'files = ('.length] + "\\n\\t\\t\\t\\t${FILE_UUID} /* AMSMB2 in Frameworks */," + s[fp + 'files = ('.length..-1] if fp
        end
        if s.include?("#{target_uuid} /* smb-writer */")
          pp = s.index('productType = ', s.index("#{target_uuid} /* smb-writer */"))
          if pp
            nl = s.index("\\n", pp)
            s = s[0, nl] + "\\n\\t\\t\\tpackageProductDependencies = (\\n\\t\\t\\t\\t${DEP_UUID} /* AMSMB2 */,\\n\\t\\t\\t);" + s[nl..-1]
          end
        end
        proj_i = s.index('isa = PBXProject;')
        if proj_i
          pk = s.index('packages = (', [proj_i - 3000, 0].max)
          if pk && pk < proj_i + 3000
            s = s[0, pk + 'packages = ('.length] + "\\n\\t\\t\\t\\t${PKG_UUID}," + s[pk + 'packages = ('.length..-1]
          else
            ti = s.index('targets = (', proj_i)
            if ti
              ls = s.rindex("\\n", ti) || 0
              s = s[0, ls + 1] + "\\t\\t\\tpackages = (\\n\\t\\t\\t\\t${PKG_UUID},\\n\\t\\t\\t);\\n" + s[ls + 1..-1]
            end
          end
        end
        File.write(pbxproj, s)
        puts '[AMSMB2-SPM] Pods.xcodeproj patched'
      end
    end
  rescue => e
    puts "[AMSMB2-SPM] #{e.class}: #{e.message}"
  end
`;

module.exports = function withAMSMB2(config) {
  return withDangerousMod(config, ['ios', (config) => {
    const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
    if (!fs.existsSync(podfilePath)) return config;
    let podfile = fs.readFileSync(podfilePath, 'utf8');
    if (podfile.includes(MARKER)) return config;
    // Inject INSIDE the existing post_install block instead of adding a new one
    const hookLine = 'post_install do |installer|';
    const hookIdx  = podfile.lastIndexOf(hookLine);
    if (hookIdx < 0) {
      // No post_install block found - shouldn't happen with Expo, but fall back to appending
      podfile += `\npost_install do |installer|\n${AMSMB2_RUBY}end\n`;
    } else {
      const nlIdx = podfile.indexOf('\n', hookIdx);
      podfile = podfile.slice(0, nlIdx + 1) + AMSMB2_RUBY + podfile.slice(nlIdx + 1);
    }
    fs.writeFileSync(podfilePath, podfile);
    return config;
  }]);
};
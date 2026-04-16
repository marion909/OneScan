const { withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const MARKER = '# [AMSMB2-SPM]';
const PKG_UUID  = 'CC000001CC000001CC000001';
const DEP_UUID  = 'CC000002CC000002CC000002';
const FILE_UUID = 'CC000003CC000003CC000003';

// Inserts AMSMB2 4.0.3 as a Swift Package into Pods.xcodeproj via a
// post_install hook so the smb-writer pod (where SmbWriterModule.swift lives)
// can see it. Uses xcodeproj only for reading UUIDs; writes via text-patching.
const RUBY_HOOK = `

${MARKER}
post_install do |installer|
  begin
    smb_target = installer.pods_project.targets.find { |t| t.name == 'smb-writer' }
    unless smb_target
      puts '[AMSMB2-SPM] smb-writer target not found, skipping'
      next
    end

    fwb = smb_target.frameworks_build_phase
    unless fwb
      puts '[AMSMB2-SPM] No frameworks build phase on smb-writer, skipping'
      next
    end

    fwb_uuid    = fwb.uuid
    target_uuid = smb_target.uuid
    puts "[AMSMB2-SPM] target=#{target_uuid} fwb=#{fwb_uuid}"

    pbxproj = File.join(installer.pods_project.path.to_s, 'project.pbxproj')
    s = File.read(pbxproj)

    if s.include?('${PKG_UUID}')
      puts '[AMSMB2-SPM] Already patched, skipping'
      next
    end

    # 1. PBXBuildFile
    s = s.sub('/* End PBXBuildFile section */',
      "\\t\\t${FILE_UUID} /* AMSMB2 in Frameworks */ = {isa = PBXBuildFile; productRef = ${DEP_UUID} /* AMSMB2 */; };\\n\\t\\t/* End PBXBuildFile section */")

    # 2. XCRemoteSwiftPackageReference section
    pkg_block = "\\t\\t${PKG_UUID} /* XCRemoteSwiftPackageReference \\"AMSMB2\\" */ = {\\n" \
      "\\t\\t\\tisa = XCRemoteSwiftPackageReference;\\n" \
      "\\t\\t\\trepositoryURL = \\"https://github.com/amosavian/AMSMB2\\";\\n" \
      "\\t\\t\\trequirement = {\\n\\t\\t\\t\\tkind = exactVersion;\\n\\t\\t\\t\\tversion = 4.0.3;\\n\\t\\t\\t};\\n" \
      "\\t\\t};"
    if s.include?('/* End XCRemoteSwiftPackageReference section */')
      s = s.sub('/* End XCRemoteSwiftPackageReference section */',
        "#{pkg_block}\\n/* End XCRemoteSwiftPackageReference section */")
    else
      s = s.sub('/* End PBXProject section */',
        "/* End PBXProject section */\\n\\n/* Begin XCRemoteSwiftPackageReference section */\\n" \
        "#{pkg_block}\\n/* End XCRemoteSwiftPackageReference section */")
    end

    # 3. XCSwiftPackageProductDependency section
    dep_block = "\\t\\t${DEP_UUID} /* AMSMB2 */ = {\\n" \
      "\\t\\t\\tisa = XCSwiftPackageProductDependency;\\n" \
      "\\t\\t\\tpackage = ${PKG_UUID} /* XCRemoteSwiftPackageReference \\"AMSMB2\\" */;\\n" \
      "\\t\\t\\tproductName = AMSMB2;\\n" \
      "\\t\\t};"
    if s.include?('/* End XCSwiftPackageProductDependency section */')
      s = s.sub('/* End XCSwiftPackageProductDependency section */',
        "#{dep_block}\\n/* End XCSwiftPackageProductDependency section */")
    else
      s = s.sub('/* End XCRemoteSwiftPackageReference section */',
        "/* End XCRemoteSwiftPackageReference section */\\n\\n/* Begin XCSwiftPackageProductDependency section */\\n" \
        "#{dep_block}\\n/* End XCSwiftPackageProductDependency section */")
    end

    # 4. Add FILE_UUID to smb-writer's Frameworks build phase
    fwb_marker = "#{fwb_uuid} /* Frameworks */"
    if s.include?(fwb_marker)
      fwb_pos   = s.index(fwb_marker)
      files_pos = s.index('files = (', fwb_pos)
      if files_pos
        insert_at = files_pos + 'files = ('.length
        s = s[0, insert_at] + "\\n\\t\\t\\t\\t${FILE_UUID} /* AMSMB2 in Frameworks */," + s[insert_at..-1]
      end
    end

    # 5. Add packageProductDependencies to smb-writer target block
    tgt_marker = "#{target_uuid} /* smb-writer */"
    if s.include?(tgt_marker)
      tgt_pos  = s.index(tgt_marker)
      prod_pos = s.index('productType = ', tgt_pos)
      if prod_pos
        nl_pos = s.index("\\n", prod_pos)
        s = s[0, nl_pos] +
          "\\n\\t\\t\\tpackageProductDependencies = (\\n\\t\\t\\t\\t${DEP_UUID} /* AMSMB2 */,\\n\\t\\t\\t);" +
          s[nl_pos..-1]
      end
    end

    # 6. Add PKG_UUID to PBXProject.packages
    proj_pos = s.index('isa = PBXProject;')
    if proj_pos
      search_start = [proj_pos - 3000, 0].max
      pkg_list = s.index('packages = (', search_start)
      if pkg_list && pkg_list < proj_pos + 3000
        insert_at = pkg_list + 'packages = ('.length
        s = s[0, insert_at] +
          "\\n\\t\\t\\t\\t${PKG_UUID} /* XCRemoteSwiftPackageReference \\"AMSMB2\\" */," +
          s[insert_at..-1]
      else
        tgts_pos = s.index('targets = (', proj_pos)
        if tgts_pos
          ln_start = s.rindex("\\n", tgts_pos) || 0
          s = s[0, ln_start + 1] +
            "\\t\\t\\tpackages = (\\n\\t\\t\\t\\t${PKG_UUID} /* XCRemoteSwiftPackageReference \\"AMSMB2\\" */,\\n\\t\\t\\t);\\n" +
            s[ln_start + 1..-1]
        end
      end
    end

    File.write(pbxproj, s)
    puts '[AMSMB2-SPM] Pods.xcodeproj patched successfully'
  rescue => e
    puts "[AMSMB2-SPM] ERROR: #{e.class}: #{e.message}"
    (e.backtrace || []).first(5).each { |l| puts "  #{l}" }
    # Do NOT re-raise: let pod install succeed so Xcode gives a clearer error
  end
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
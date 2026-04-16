const { withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

// Sentinel used for idempotency check in the Podfile
const MARKER = '# [AMSMB2-SPM]';

// Ruby post_install hook – runs after CocoaPods generates Pods.xcodeproj,
// so we can inject AMSMB2 as an SPM package into that project and link it
// to the smb-writer pod target (which is where SmbWriterModule.swift lives).
const RUBY_HOOK = `

${MARKER}
post_install do |installer|
  smb_target = installer.pods_project.targets.find { |t| t.name == 'smb-writer' }
  next unless smb_target

  project = installer.pods_project

  # Idempotency
  already = project.root_object.package_references.any? do |r|
    r.respond_to?(:repositoryURL) && r.repositoryURL.to_s.include?('AMSMB2')
  end
  next if already

  # 1. XCRemoteSwiftPackageReference in the Pods project
  pkg = project.new(Xcodeproj::Project::Object::XCRemoteSwiftPackageReference)
  pkg.repositoryURL = 'https://github.com/amosavian/AMSMB2'
  pkg.requirement   = { 'kind' => 'exactVersion', 'version' => '4.0.3' }
  project.root_object.package_references << pkg

  # 2. XCSwiftPackageProductDependency on smb-writer target
  dep = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
  dep.package      = pkg
  dep.product_name = 'AMSMB2'
  smb_target.package_product_dependencies << dep

  # 3. PBXBuildFile in Frameworks phase
  bf = project.new(Xcodeproj::Project::Object::PBXBuildFile)
  bf.product_ref = dep
  smb_target.frameworks_build_phase.files << bf

  installer.pods_project.save
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
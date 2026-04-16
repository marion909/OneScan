const { withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

const MARKER = '# [AMSMB2-SPM]';
const PKG_UUID  = 'CC000001CC000001CC000001';
const DEP_UUID  = 'CC000002CC000002CC000002';
const FILE_UUID = 'CC000003CC000003CC000003';

// Minimal test - just print diagnostics to confirm hook runs
const RUBY_HOOK = `

${MARKER}
post_install do |installer|
  puts '[AMSMB2-SPM] post_install hook started'
  smb_target = installer.pods_project.targets.find { |t| t.name == 'smb-writer' }
  puts "[AMSMB2-SPM] smb_target=#{smb_target ? smb_target.uuid : 'NOT FOUND'}"
  puts "[AMSMB2-SPM] post_install hook done"
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
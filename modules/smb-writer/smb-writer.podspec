require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'smb-writer'
  s.version        = package['version']
  s.summary        = package['description'] || 'SMB Writer Expo Module'
  s.license        = package['license'] || 'MIT'
  s.homepage       = package['homepage'] || 'https://github.com/expo/expo'
  s.author         = package['author'] || ''
  s.platform       = :ios, '13.4'
  s.swift_version  = '5.4'

  s.source         = { git: '' }
  s.source_files   = 'ios/**/*.{swift}'

  s.dependency 'ExpoModulesCore'
end

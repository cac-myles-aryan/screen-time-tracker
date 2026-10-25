Pod::Spec.new do |s|
  s.name           = 'FocusControl'
  s.version        = '1.0.0'
  s.summary        = 'Screen Time blocking and contact picking for Ball and Chain'
  s.description    = 'FamilyControls / ManagedSettings / DeviceActivity wrapper exposed to React Native.'
  s.license        = 'MIT'
  s.author         = 'ballnchain'
  s.homepage       = 'https://example.com'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end

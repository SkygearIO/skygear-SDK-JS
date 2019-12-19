require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "skygear-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = "skygear-react-native"
  s.homepage     = "https://github.com/SkygearIO/skygear-SDK-JS"
  s.license      = "MIT"
  s.platforms    = { :ios => "9.0" }
  s.authors      = { 'Louis Chan' => 'louischan@oursky.com' }
  s.summary      = "skygear-react-native"
  s.source       = { :git => 'https://github.com/SkygearIO/skygear-SDK-JS.git' }

  s.source_files = "ios/**/*.{h,m,swift}"
  s.requires_arc = true

  s.dependency "React"
end

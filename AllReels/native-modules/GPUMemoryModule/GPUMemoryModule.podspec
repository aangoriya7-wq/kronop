require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "GPUMemoryModule"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.description  = <<-DESC
                  A JSI-based native module for GPU and memory monitoring in React Native
                   DESC
  s.homepage     = "https://github.com/your-repo/GPUMemoryModule"
  s.license      = package["license"]
  s.authors      = package["author"]
  s.platforms    = { :ios => "12.0", :android => "21" }
  s.source       = { :git => "https://github.com/your-repo/GPUMemoryModule.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}", "cpp/**/*.{h,cpp}"
  s.requires_arc = true

  s.dependency "React-Core"
  s.dependency "React-jsi"
  
  # Compiler flags for JSI
  s.compiler_flags = folly_compiler_flags + " -DRCT_NEW_ARCH_ENABLED=1"
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\" \"$(PODS_ROOT)/Folly\" \"$(PODS_ROOT)/Headers/Private/React-Core\""
  }
  
  # For C++ files
  s.public_header_files = "cpp/**/*.h"
end

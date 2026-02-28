cmake_minimum_required(VERSION 3.13)
project(GPUMemoryModule)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find React Native
find_package(ReactAndroid REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)

# Add source files
add_library(
  GPUMemoryModule
  SHARED
  ../cpp/GPUMemoryModule.cpp
  ../cpp/GPUMemoryModule.h
)

# Link libraries
target_link_libraries(
  GPUMemoryModule
  PRIVATE
  ReactAndroid::jsi
  ReactAndroid::hermes
  ReactAndroid::reactnativejni
  ReactAndroid::react_nativemodule_core
  fbjni::fbjni
  log
)

# Include directories
target_include_directories(
  GPUMemoryModule
  PRIVATE
  ../cpp
  ${ReactAndroid_INCLUDE_DIRS}
  ${fbjni_INCLUDE_DIRS}
)

cmake_minimum_required(VERSION 3.18.1)
project(Kronop_Cleaner VERSION 1.0.0 LANGUAGES CXX C)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Platform-specific configurations
if(ANDROID)
    # Android-specific settings for React Native
    set(ANDROID_PLATFORM 21)
    set(ANDROID_STL c++_shared)
    set(ANDROID_ABI arm64-v8a)
    
    # Android NDK toolchain
    set(CMAKE_TOOLCHAIN_FILE ${ANDROID_NDK}/build/cmake/android.toolchain.cmake)
    
    # Android-specific compile flags
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fPIC -Wall -Wextra")
    set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG -ffast-math -march=armv8-a -ftree-vectorize")
    set(CMAKE_CXX_FLAGS_DEBUG "-O0 -g -DDEBUG -fsanitize=address")
    
    # Enable NEON optimizations for ARM64
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -mfpu=neon -ftree-vectorize")
else()
    # Desktop/Linux settings
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fPIC -Wall -Wextra")
    set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG -ffast-math -march=native")
    set(CMAKE_CXX_FLAGS_DEBUG "-O0 -g -DDEBUG")
endif()

# Compiler-specific options
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -pthread")
    if(ANDROID)
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -D__ANDROID_API__=21")
    endif()
endif()

# Find required packages
find_package(PkgConfig REQUIRED)

# FFTW3 dependency
if(ANDROID)
    # For Android, we'll build FFTW3 from source
    set(FFTW3_INCLUDE_DIRS ${CMAKE_CURRENT_SOURCE_DIR}/third_party/fftw3/include)
    set(FFTW3_LIBRARIES fftw3f)
    set(FFTW3_FOUND TRUE)
else()
    pkg_check_modules(FFTW3 REQUIRED fftw3f)
endif()

# OpenGL/GLES dependencies
if(ANDROID)
    find_package(GLES3 REQUIRED)
    find_package(EGL REQUIRED)
    set(OPENGL_LIBRARIES GLESv3 EGL)
else()
    find_package(OpenGL REQUIRED)
    find_package(GLEW REQUIRED)
    
    # Try to find Vulkan (optional)
    find_package(Vulkan QUIET)
    if(Vulkan_FOUND)
        set(VULKAN_AVAILABLE TRUE)
        message(STATUS "Vulkan found - enabling Vulkan compute support")
        add_definitions(-DVULKAN_AVAILABLE)
    else()
        set(VULKAN_AVAILABLE FALSE)
        message(STATUS "Vulkan not found - using OpenGL compute only")
    endif()
endif()

# OpenSSL for security (optional - can be disabled)
option(ENABLE_SECURITY "Enable AES-256 encryption" ON)
if(ENABLE_SECURITY)
    if(ANDROID)
        # For Android, use system OpenSSL
        find_package(OpenSSL REQUIRED)
    else()
        find_package(OpenSSL REQUIRED)
    endif()
    add_definitions(-DENABLE_SECURITY)
endif()

# Include directories
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/src/core
    ${CMAKE_CURRENT_SOURCE_DIR}/src/processing
    ${CMAKE_CURRENT_SOURCE_DIR}/src/gpu
    ${CMAKE_CURRENT_SOURCE_DIR}/src/optimization
    ${CMAKE_CURRENT_SOURCE_DIR}/src/integration
    ${FFTW3_INCLUDE_DIRS}
)

# Add all source files from organized folders
set(KRONOP_SOURCES
    # Core engine
    src/core/Deblur_Core.cpp
    src/core/FFT_Logic.hpp
    
    # Advanced processing modules
    src/processing/Dynamic_PSF/OpticalFlow.cpp
    src/processing/Dynamic_PSF/OpticalFlow.hpp
    src/processing/Smart_Sharpening/SmartSharpening.cpp
    src/processing/Smart_Sharpening/SmartSharpening.hpp
    src/processing/ChunkManager.cpp
    src/processing/ChunkManager.hpp
    
    # GPU acceleration
    src/gpu/VulkanCompute.cpp
    src/gpu/VulkanCompute.hpp
    src/gpu/VulkanShaderCompiler.cpp
    src/gpu/Advanced_Shaders/ComputeShaders.cpp
    src/gpu/Advanced_Shaders/ComputeShaders.hpp
    
    # ARM64 optimizations
    src/optimization/ARM64_Optimized_Processing.cpp
    src/optimization/VideoStreamer.cpp
    src/optimization/VideoStreamer.hpp
    
    # Security and integration
    src/integration/Security_Shield.cpp
    src/integration/Security_Shield.hpp
    src/integration/AudioVideoSync.cpp
    src/integration/AudioVideoSync.hpp
    src/integration/KronopNativeInterface.cpp
)

# Create shared library for React Native
add_library(kronop_cleaner SHARED ${KRONOP_SOURCES})

# Set target properties
set_target_properties(kronop_cleaner PROPERTIES
    POSITION_INDEPENDENT_CODE ON
    CXX_STANDARD 17
    CXX_STANDARD_REQUIRED ON
)

# Link libraries
target_link_libraries(kronop_cleaner
    ${FFTW3_LIBRARIES}
    pthread
    dl
)

# Platform-specific linking
if(ANDROID)
    target_link_libraries(kronop_cleaner
        GLESv3
        EGL
        android
        log
        jnigraphics
    )
    
    # Add Android-specific definitions
    target_compile_definitions(kronop_cleaner PRIVATE
        JNI_EXPORT="__attribute__((visibility(\"default\")))"
        __ANDROID_API__=21
    )
else()
    target_link_libraries(kronop_cleaner
        ${OPENGL_LIBRARIES}
        GLEW::GLEW
    )
    
    # Link Vulkan if available
    if(VULKAN_AVAILABLE)
        target_link_libraries(kronop_cleaner
            Vulkan::Vulkan
        )
    endif()
endif()

# Security linking
if(ENABLE_SECURITY AND OpenSSL_FOUND)
    target_link_libraries(kronop_cleaner
        OpenSSL::SSL
        OpenSSL::Crypto
    )
endif()

# Compiler-specific optimizations
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    target_compile_options(kronop_cleaner PRIVATE
        $<$<CONFIG:Release>:-O3 -ffast-math -march=native -funroll-loops>
        $<$<CONFIG:Debug>:-O0 -g -fsanitize=address>
    )
elseif(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    target_compile_options(kronop_cleaner PRIVATE
        $<$<CONFIG:Release>:-O3 -ffast-math -march=native -funroll-loops>
        $<$<CONFIG:Debug>:-O0 -g -fsanitize=address>
    )
endif()

# ARM64-specific optimizations
if(ANDROID AND CMAKE_SYSTEM_PROCESSOR MATCHES "arm64|aarch64")
    target_compile_options(kronop_cleaner PRIVATE
        -march=armv8-a
        -mtune=cortex-a76
        -ftree-vectorize
        -ffast-math
        -funsafe-math-optimizations
        -fno-protected-exceptions
        -fno-exceptions
        -fno-rtti
    )
    
    # Enable NEON intrinsics
    target_compile_definitions(kronop_cleaner PRIVATE __ARM_NEON)
endif()

# Preprocessor definitions
target_compile_definitions(kronop_cleaner PRIVATE
    KRONOP_VERSION_MAJOR=1
    KRONOP_VERSION_MINOR=0
    KRONOP_VERSION_PATCH=0
    KRONOP_BUILD_TYPE=$<CONFIG>
)

# Installation rules
install(TARGETS kronop_cleaner
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
    RUNTIME DESTINATION bin
)

# Install headers for development
install(FILES
    src/core/FFT_Logic.hpp
    src/core/Deblur_Core.cpp
    src/processing/ChunkManager.hpp
    src/gpu/VulkanCompute.hpp
    DESTINATION include/kronop
)

# Create pkg-config file
configure_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/build_system/kronop_cleaner.pc.in"
    "${CMAKE_CURRENT_BINARY_DIR}/kronop_cleaner.pc"
    @ONLY
)

install(FILES
    "${CMAKE_CURRENT_BINARY_DIR}/kronop_cleaner.pc"
    DESTINATION lib/pkgconfig
)

# Testing (optional)
option(BUILD_TESTS "Build unit tests" OFF)
if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
    
    # Add test executable
    add_executable(kronop_tests
        tests/test_framework.cpp
        tests/run_tests.cpp
        tests/simple_stress_test.cpp
        tests/stress_test_suite.cpp
    )
    
    target_link_libraries(kronop_tests
        kronop_cleaner
        ${FFTW3_LIBRARIES}
    )
endif()

# Documentation (optional)
option(BUILD_DOCS "Build documentation" OFF)
if(BUILD_DOCS)
    find_package(Doxygen)
    if(DOXYGEN_FOUND)
        add_subdirectory(docs)
    endif()
endif()

# Print configuration summary
message(STATUS "")
message(STATUS "🚀 Kronop Cleaner AI Configuration Summary:")
message(STATUS "  Version: ${PROJECT_VERSION}")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  Platform: ${CMAKE_SYSTEM_NAME}")
message(STATUS "  Architecture: ${CMAKE_SYSTEM_PROCESSOR}")
message(STATUS "  Compiler: ${CMAKE_CXX_COMPILER_ID}")
message(STATUS "  Android NDK: ${ANDROID_NDK}")
message(STATUS "  FFTW3: ${FFTW3_FOUND}")
message(STATUS "  Vulkan: ${VULKAN_AVAILABLE}")
message(STATUS "  Security: ${ENABLE_SECURITY}")
message(STATUS "  Tests: ${BUILD_TESTS}")
message(STATUS "  Docs: ${BUILD_DOCS}")
message(STATUS "  Source files: ${CMAKE_CURRENT_SOURCE_DIR}")
message(STATUS "  Binary dir: ${CMAKE_CURRENT_BINARY_DIR}")
message(STATUS "")

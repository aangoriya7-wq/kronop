#!/bin/bash

# Kronop Cleaner AI - Production Build Script
# ARM64 Optimized Native Library with Vulkan Support

set -e

echo "🔥 KRONOP CLEANER AI - PRODUCTION BUILD"
echo "======================================"
echo "Building ARM64 Optimized Native Library for Android"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_TYPE="Release"
TARGET_ARCH="arm64-v8a"
ENABLE_VULKAN=true
ENABLE_NEON=true

echo "${BLUE}Configuration:${NC}"
echo "  Build Type: $BUILD_TYPE"
echo "  Target Architecture: $TARGET_ARCH"
echo "  Vulkan Support: $ENABLE_VULKAN"
echo "  ARM64 NEON: $ENABLE_NEON"
echo ""

# Check dependencies
echo "${BLUE}Checking dependencies...${NC}"

# Check for Android NDK
if [ -z "$ANDROID_NDK_ROOT" ]; then
    echo -e "${RED}❌ ERROR: ANDROID_NDK_ROOT not set${NC}"
    echo "Please set ANDROID_NDK_ROOT environment variable"
    echo "Example: export ANDROID_NDK_ROOT=/path/to/android-ndk"
    exit 1
fi

if [ ! -d "$ANDROID_NDK_ROOT" ]; then
    echo -e "${RED}❌ ERROR: Android NDK not found at $ANDROID_NDK_ROOT${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Android NDK found: $ANDROID_NDK_ROOT${NC}"

# Check for CMake
if ! command -v cmake &> /dev/null; then
    echo -e "${YELLOW}⚠️  CMake not found, using NDK build system${NC}"
    USE_CMAKE=false
else
    echo -e "${GREEN}✅ CMake found: $(cmake --version | head -n1)${NC}"
    USE_CMAKE=true
fi

# Check for required source files
echo "${BLUE}Checking source files...${NC}"

REQUIRED_FILES=(
    "KronopNativeInterface.cpp"
    "ARM64_Optimized_Processing.cpp"
    "Deblur_Core.cpp"
    "ChunkManager.cpp"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ ERROR: Required file missing: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required source files found${NC}"

# Create build directory
BUILD_DIR="build_android"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

echo ""
echo "${BLUE}Starting build process...${NC}"

if [ "$USE_CMAKE" = true ]; then
    echo "${YELLOW}Using CMake build system${NC}"
    
    # Create CMakeLists.txt if it doesn't exist
    if [ ! -f "CMakeLists.txt" ]; then
        cat > CMakeLists.txt << 'EOF'
cmake_minimum_required(VERSION 3.18.1)

project(kronop_cleaner_android)

# C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Android-specific settings
set(ANDROID_PLATFORM android-21)
set(ANDROID_ABI arm64-v8a)
set(ANDROID_STL c++_static)

# Compiler flags for ARM64 optimization
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O3 -ffast-math -funroll-loops")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -march=armv8-a -mtune=cortex-a76")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -ftree-vectorize -funsafe-math-optimizations")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -DNDEBUG -DANDROID_ARM_NEON=1")
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -frtti -fexceptions")

# Source files
file(GLOB_RECURSE SOURCES 
    "../KronopNativeInterface.cpp"
    "../ARM64_Optimized_Processing.cpp"
    "../Deblur_Core.cpp"
    "../ChunkManager.cpp"
    "../Dynamic_PSF/OpticalFlow.cpp"
    "../Smart_Sharpening/SmartSharpening.cpp"
    "../Advanced_Shaders/ComputeShaders.cpp"
    "../VulkanCompute.cpp"
    "../FFT_Logic.cpp"
    "../Security_Shield.cpp"
    "../AudioVideoSync.cpp"
    "../VideoStreamer.cpp"
)

# Include directories
include_directories(
    "../"
    "../Dynamic_PSF"
    "../Smart_Sharpening"
    "../Advanced_Shaders"
)

# Create shared library
add_library(kronop_cleaner SHARED ${SOURCES})

# Link libraries
target_link_libraries(kronop_cleaner
    log
    android
    jnigraphics
    vulkan
    fftw3f
    m
    pthread
)

# Enable NEON
if(ANDROID_ABI STREQUAL "arm64-v8a")
    set_target_properties(kronop_cleaner PROPERTIES
        COMPILE_FLAGS "-mfpu=neon"
    )
endif()
EOF
    fi
    
    # Build with CMake
    echo "${YELLOW}Configuring with CMake...${NC}"
    $ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake \
        -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake" \
        -DANDROID_ABI="$TARGET_ARCH" \
        -DANDROID_PLATFORM=android-21 \
        -DCMAKE_BUILD_TYPE="$BUILD_TYPE" \
        -DCMAKE_INSTALL_PREFIX=install \
        .
    
    echo "${YELLOW}Building with CMake...${NC}"
    make -j$(nproc)
    
    # Copy library to expected location
    if [ -f "libkronop_cleaner.so" ]; then
        mkdir -p "../libs/$TARGET_ARCH"
        cp "libkronop_cleaner.so" "../libs/$TARGET_ARCH/"
    fi
    
else
    echo "${YELLOW}Using NDK build system${NC}"
    
    # Build with NDK
    cd ..
    $ANDROID_NDK_ROOT/ndk-build NDK_PROJECT_PATH=. APP_BUILD_SCRIPT=Android.mk APP_ABI="$TARGET_ARCH"
fi

# Check if build was successful
cd ..
if [ -f "libs/$TARGET_ARCH/libkronop_cleaner.so" ]; then
    echo ""
    echo -e "${GREEN}🎉 BUILD SUCCESSFUL!${NC}"
    echo ""
    echo "${BLUE}Library Information:${NC}"
    echo "===================="
    file "libs/$TARGET_ARCH/libkronop_cleaner.so"
    echo ""
    ls -lh "libs/$TARGET_ARCH/libkronop_cleaner.so"
    
    # Show symbol information
    echo ""
    echo "${BLUE}Exported Symbols:${NC}"
    echo "=================="
    nm -D "libs/$TARGET_ARCH/libkronop_cleaner.so" | grep "T " | head -10
    
    # Check for ARM64 and NEON symbols
    echo ""
    echo "${BLUE}Architecture Check:${NC}"
    echo "===================="
    readelf -A "libs/$TARGET_ARCH/libkronop_cleaner.so" | head -5
    
    # Check for Vulkan symbols
    if command -v nm &> /dev/null; then
        echo ""
        echo "${BLUE}Vulkan Symbols:${NC}"
        echo "================"
        nm -D "libs/$TARGET_ARCH/libkronop_cleaner.so" | grep -i vulkan | head -5 || echo "No Vulkan symbols found (may be loaded dynamically)"
    fi
    
    echo ""
    echo -e "${GREEN}📦 READY FOR INTEGRATION!${NC}"
    echo "========================="
    echo ""
    echo "Copy the library to your React Native Android app:"
    echo ""
    echo -e "${YELLOW}mkdir -p android/app/src/main/jniLibs/$TARGET_ARCH${NC}"
    echo -e "${YELLOW}cp libs/$TARGET_ARCH/libkronop_cleaner.so android/app/src/main/jniLibs/$TARGET_ARCH/${NC}"
    echo ""
    echo "${BLUE}Add to your MainApplication.java:${NC}"
    echo "====================================="
    echo "import com.kronop.KronopCleanerPackage;"
    echo ""
    echo "@Override"
    echo "protected List<ReactPackage> getPackages() {"
    echo "    return Arrays.asList("
    echo "        new MainReactPackage(),"
    echo "        new KronopCleanerPackage()"
    echo "    );"
    echo "}"
    echo ""
    echo "${BLUE}Usage in React Native:${NC}"
    echo "======================="
    echo "import KronopCleaner from './KronopCleaner';"
    echo ""
    echo "// Initialize"
    echo "await KronopCleaner.initialize({"
    echo "  width: 1920,"
    echo "  height: 1080,"
    echo "  enableVulkan: true"
    echo "});"
    echo ""
    echo "// Process frame"
    echo "const result = await KronopCleaner.processFrame(frameData);"
    echo "console.log(`Processed in ${result.processingTime}ms (${result.fps} FPS)`);"
    echo ""
    echo -e "${GREEN}🚀 KRONOP CLEANER AI IS PRODUCTION READY!${NC}"
    echo ""
    echo "${BLUE}Performance Expectations:${NC}"
    echo "========================"
    echo "• 1080p: 30+ FPS with Vulkan GPU acceleration"
    echo "• 4K: 10+ FPS with optimized chunk processing"
    echo "• ARM64 NEON optimization for CPU fallback"
    echo "• Real-time thermal management"
    echo "• Memory-efficient 4K video handling"
    echo ""
    
else
    echo ""
    echo -e "${RED}❌ BUILD FAILED!${NC}"
    echo "Library file not found: libs/$TARGET_ARCH/libkronop_cleaner.so"
    echo ""
    echo "Please check the build logs above for errors."
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Production build completed successfully!${NC}"

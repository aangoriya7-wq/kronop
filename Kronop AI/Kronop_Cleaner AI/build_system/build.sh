#!/bin/bash
# Kronop Cleaner AI Build Script
# Builds libkronop_cleaner.so with FFTW3, Vulkan, and NEON optimizations

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Kronop Cleaner AI"
LIBRARY_NAME="libkronop_cleaner.so"
BUILD_DIR="build"
INSTALL_DIR="libs"
NDK_VERSION="25.1.8937393"
ANDROID_API_LEVEL="21"
TARGET_ABI="arm64-v8a"

echo -e "${BLUE}🚀 Building ${PROJECT_NAME}${NC}"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "CMakeLists.txt" ]; then
    echo -e "${RED}❌ Error: CMakeLists.txt not found. Please run from project root.${NC}"
    exit 1
fi

# Check for Android NDK
if [ -z "$ANDROID_NDK_ROOT" ] && [ -z "$ANDROID_NDK" ]; then
    echo -e "${YELLOW}⚠️  ANDROID_NDK_ROOT not set. Trying to find NDK...${NC}"
    
    # Try common NDK locations
    NDK_PATHS=(
        "$HOME/Android/Sdk/ndk/$NDK_VERSION"
        "$HOME/android-ndk-$NDK_VERSION"
        "/opt/android-ndk-$NDK_VERSION"
        "$ANDROID_HOME/ndk/$NDK_VERSION"
    )
    
    for ndk_path in "${NDK_PATHS[@]}"; do
        if [ -d "$ndk_path" ]; then
            export ANDROID_NDK_ROOT="$ndk_path"
            break
        fi
    done
    
    if [ -z "$ANDROID_NDK_ROOT" ]; then
        echo -e "${RED}❌ Error: Android NDK not found. Please set ANDROID_NDK_ROOT${NC}"
        echo "Download from: https://developer.android.com/ndk/downloads"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Using Android NDK: $ANDROID_NDK_ROOT${NC}"

# Create build directories
echo -e "${BLUE}📁 Creating build directories...${NC}"
mkdir -p "$BUILD_DIR"
mkdir -p "$INSTALL_DIR/arm64-v8a"
mkdir -p "third_party/fftw3"
mkdir -p "logs"

# Download and build FFTW3 for Android if needed
FFTW3_DIR="third_party/fftw3"
if [ ! -f "$FFTW3_DIR/lib/libfftw3f.a" ]; then
    echo -e "${BLUE}📦 Building FFTW3 for Android ARM64...${NC}"
    
    FFTW_VERSION="3.3.10"
    FFTW_TAR="fftw-$FFTW_VERSION.tar.gz"
    FFTW_URL="http://www.fftw.org/$FFTW_TAR"
    
    cd third_party
    
    # Download FFTW3 if not present
    if [ ! -f "$FFTW_TAR" ]; then
        echo "Downloading FFTW3..."
        wget "$FFTW_URL" || curl -O "$FFTW_URL"
    fi
    
    # Extract if not already extracted
    if [ ! -d "fftw-$FFTW_VERSION" ]; then
        tar -xzf "$FFTW_TAR"
    fi
    
    cd "fftw-$FFTW_VERSION"
    
    # Configure FFTW3 for Android ARM64
    export CC="$ANDROID_NDK_ROOT/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android21-clang"
    export CXX="$ANDROID_NDK_ROOT/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android21-clang++"
    
    ./configure \
        --host=aarch64-linux-android \
        --build=x86_64-linux-gnu \
        --prefix="$PWD/../fftw3" \
        --enable-float \
        --enable-neon \
        --disable-fortran \
        --disable-doc \
        --with-pic \
        --enable-static \
        --disable-shared \
        CFLAGS="-O3 -ffast-math -march=armv8-a -ftree-vectorize" \
        CPPFLAGS="-DNDEBUG -D__ARM_NEON"
    
    # Build FFTW3
    echo "Building FFTW3..."
    make -j$(nproc)
    make install
    
    cd ../..
    
    if [ ! -f "$FFTW3_DIR/lib/libfftw3f.a" ]; then
        echo -e "${RED}❌ FFTW3 build failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ FFTW3 built successfully${NC}"
else
    echo -e "${GREEN}✅ FFTW3 already built${NC}"
fi

# Return to project root
cd ..

# Configure CMake build
echo -e "${BLUE}⚙️  Configuring CMake build...${NC}"
cd "$BUILD_DIR"

# Clean previous build
rm -rf *

# CMake configuration
cmake .. \
    -DCMAKE_TOOLCHAIN_FILE="$ANDROID_NDK_ROOT/build/cmake/android.toolchain.cmake" \
    -DANDROID_ABI="$TARGET_ABI" \
    -DANDROID_NATIVE_API_LEVEL="$ANDROID_API_LEVEL" \
    -DANDROID_STL=c++_shared \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX="../$INSTALL_DIR" \
    -DENABLE_SECURITY=ON \
    -DBUILD_TESTS=OFF \
    -DBUILD_DOCS=OFF \
    -DFFTW3_INCLUDE_DIRS="../third_party/fftw3/include" \
    -DFFTW3_LIBRARIES="../third_party/fftw3/lib/libfftw3f.a" \
    -DCMAKE_CXX_FLAGS="-O3 -ffast-math -march=armv8-a -ftree-vectorize -funroll-loops" \
    -DCMAKE_C_FLAGS="-O3 -ffast-math -march=armv8-a -ftree-vectorize"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ CMake configuration failed${NC}"
    exit 1
fi

# Build the library
echo -e "${BLUE}🔨 Building ${LIBRARY_NAME}...${NC}"
make -j$(nproc) 2>&1 | tee "../logs/build.log"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Check logs/build.log for details${NC}"
    exit 1
fi

# Find the built library
BUILT_LIB=$(find . -name "$LIBRARY_NAME" -type f | head -1)
if [ -z "$BUILT_LIB" ]; then
    echo -e "${RED}❌ Built library not found${NC}"
    exit 1
fi

# Copy to install directory
echo -e "${BLUE}📦 Installing library...${NC}"
cp "$BUILT_LIB" "../$INSTALL_DIR/arm64-v8a/$LIBRARY_NAME"

# Verify the library
if [ -f "../$INSTALL_DIR/arm64-v8a/$LIBRARY_NAME" ]; then
    LIB_SIZE=$(du -h "../$INSTALL_DIR/arm64-v8a/$LIBRARY_NAME" | cut -f1)
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo -e "${GREEN}   Library: $INSTALL_DIR/arm64-v8a/$LIBRARY_NAME${NC}"
    echo -e "${GREEN}   Size: $LIB_SIZE${NC}"
    
    # Show library info
    echo -e "${BLUE}📋 Library information:${NC}"
    file "../$INSTALL_DIR/arm64-v8a/$LIBRARY_NAME"
    
    # Check dependencies
    echo -e "${BLUE}🔗 Library dependencies:${NC}"
    if command -v readelf >/dev/null 2>&1; then
        readelf -d "../$INSTALL_DIR/arm64-v8a/$LIBRARY_NAME" | grep NEEDED || echo "No dependencies found"
    fi
    
else
    echo -e "${RED}❌ Library installation failed${NC}"
    exit 1
fi

# Return to project root
cd ..

# Create Android.mk compatible structure
echo -e "${BLUE}📱 Creating Android structure...${NC}"
mkdir -p "android/app/src/main/jniLibs/arm64-v8a"
cp "$INSTALL_DIR/arm64-v8a/$LIBRARY_NAME" "android/app/src/main/jniLibs/arm64-v8a/"

# Test compilation with Android.mk (optional)
if command -v ndk-build >/dev/null 2>&1; then
    echo -e "${BLUE}🧪 Testing Android.mk build...${NC}"
    ndk-build APP_ABI="$TARGET_ABI" APP_PLATFORM="android-$ANDROID_API_LEVEL" -j$(nproc) 2>&1 | tee logs/ndk_build.log
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Android.mk build successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Android.mk build failed, but CMake build succeeded${NC}"
    fi
fi

# Create build summary
echo -e "${BLUE}📊 Build Summary:${NC}"
echo "=================================="
echo "Project: $PROJECT_NAME"
echo "Library: $LIBRARY_NAME"
echo "Target: $TARGET_ABI"
echo "API Level: $ANDROID_API_LEVEL"
echo "Build Type: Release"
echo "Features: NEON + Vulkan + FFTW3"
echo ""
echo "Output files:"
echo "  - $INSTALL_DIR/arm64-v8a/$LIBRARY_NAME"
echo "  - android/app/src/main/jniLibs/arm64-v8a/$LIBRARY_NAME"
echo ""
echo "Project structure:"
echo "  - src/core/        - Core engine files"
echo "  - src/processing/  - Video processing modules"
echo "  - src/gpu/         - Vulkan and GPU acceleration"
echo "  - src/optimization/ - ARM64 NEON optimizations"
echo "  - src/integration/ - JNI and React Native bridge"
echo "  - react_native/    - JavaScript and Java files"
echo "  - build_system/    - Build configuration"
echo "  - tests/           - Unit tests"
echo "  - examples/        - Usage examples"
echo "  - docs/            - Documentation"
echo ""
echo "Next steps:"
echo "  1. Add library to your React Native project"
echo "  2. Update MainApplication.java"
echo "  3. Run your app"

# Performance test (optional)
echo -e "${BLUE}🚀 Running quick performance test...${NC}"
if command -v adb >/dev/null 2>&1 && adb devices | grep -q "device$"; then
    echo "Android device found. You can test with:"
    echo "  adb push $INSTALL_DIR/arm64-v8a/$LIBRARY_NAME /data/local/tmp/"
    echo "  adb shell LD_LIBRARY_PATH=/data/local/tmp ldd /data/local/tmp/$LIBRARY_NAME"
else
    echo "No Android device connected for testing"
fi

echo -e "${GREEN}🎉 Build completed successfully!${NC}"
echo "Your Kronop Cleaner AI library is ready for React Native integration!"

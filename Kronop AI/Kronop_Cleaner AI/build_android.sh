#!/bin/bash

# Kronop Cleaner AI - Android ARM64 Build Script
# Creates optimized shared library for React Native integration

set -e

echo "🚀 Building Kronop Cleaner AI for Android ARM64..."
echo "=================================================="

# Check if Android NDK is available
if [ -z "$ANDROID_NDK_ROOT" ]; then
    echo "❌ ERROR: ANDROID_NDK_ROOT environment variable not set"
    echo "Please set ANDROID_NDK_ROOT to your Android NDK path"
    echo "Example: export ANDROID_NDK_ROOT=/path/to/android-ndk"
    exit 1
fi

# Check if NDK exists
if [ ! -d "$ANDROID_NDK_ROOT" ]; then
    echo "❌ ERROR: Android NDK not found at $ANDROID_NDK_ROOT"
    exit 1
fi

echo "✅ Using Android NDK: $ANDROID_NDK_ROOT"

# Set build environment
export NDK_PROJECT_PATH=$(pwd)
export APP_BUILD_SCRIPT=$(pwd)/Android.mk
export APP_ABI=arm64-v8a
export APP_PLATFORM=android-21

# Create output directory
mkdir -p libs/arm64-v8a

echo "🔧 Building with ARM64 NEON optimizations..."

# Build the library
$ANDROID_NDK_ROOT/ndk-build NDK_PROJECT_PATH=. APP_BUILD_SCRIPT=Android.mk APP_ABI=arm64-v8a

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    # Check if library was created
    if [ -f "libs/arm64-v8a/libkronop_cleaner.so" ]; then
        echo "📦 Shared library created: libs/arm64-v8a/libkronop_cleaner.so"
        
        # Show library info
        echo ""
        echo "📋 Library Information:"
        echo "===================="
        file libs/arm64-v8a/libkronop_cleaner.so
        echo ""
        ls -lh libs/arm64-v8a/libkronop_cleaner.so
        
        # Show symbol information
        echo ""
        echo "🔍 Exported Symbols:"
        echo "=================="
        nm -D libs/arm64-v8a/libkronop_cleaner.so | grep "T " | head -10
        
        echo ""
        echo "🎯 READY FOR INTEGRATION!"
        echo "========================="
        echo "Copy libs/arm64-v8a/libkronop_cleaner.so to your Android app:"
        echo "  android/app/src/main/jniLibs/arm64-v8a/libkronop_cleaner.so"
        echo ""
        echo "Use in React Native:"
        echo "  import { NativeModules } from 'react-native';"
        echo "  const { KronopNativeInterface } = NativeModules;"
        
    else
        echo "❌ ERROR: Library file not found"
        exit 1
    fi
else
    echo "❌ ERROR: Build failed"
    exit 1
fi

echo ""
echo "🔥 Build completed successfully!"
echo "🚀 Kronop Cleaner AI is ready for production deployment!"

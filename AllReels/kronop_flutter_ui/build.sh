#!/bin/bash

# Build script for Kronop Flutter UI
# This script builds the Rust video engine and prepares the Flutter app

set -e

echo "🚀 Building Kronop Flutter UI..."

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter is not installed. Please install Flutter SDK first."
    exit 1
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo is not installed. Please install Rust first."
    exit 1
fi

# Build the Rust video engine
echo "🔨 Building Rust video engine..."
cd modules/kronop-video-engine
cargo build --release --target-dir ../../kronop_flutter_ui/native

# Copy native libraries to Flutter project
echo "📦 Copying native libraries..."
cd ../../kronop_flutter_ui

# Create native directory if it doesn't exist
mkdir -p native/libs

# Copy built libraries based on platform
if [ -f "native/target/release/libkronop_video_engine.so" ]; then
    cp native/target/release/libkronop_video_engine.so native/libs/
    echo "✅ Linux library copied"
fi

if [ -f "native/target/release/libkronop_video_engine.dylib" ]; then
    cp native/target/release/libkronop_video_engine.dylib native/libs/
    echo "✅ macOS library copied"
fi

if [ -f "native/target/release/kronop_video_engine.dll" ]; then
    cp native/target/release/kronop_video_engine.dll native/libs/
    echo "✅ Windows library copied"
fi

# Install Flutter dependencies
echo "📦 Installing Flutter dependencies..."
flutter pub get

# Generate code if needed
echo "🔧 Generating code..."
flutter packages pub run build_runner build --delete-conflicting-outputs

# Build the Flutter app
echo "🔨 Building Flutter app..."
flutter build apk --release
flutter build ios --release --no-codesign

echo "✅ Build completed successfully!"
echo "🎉 Kronop Flutter UI is ready to run!"
echo ""
echo "To run the app:"
echo "  flutter run"
echo ""
echo "To run on specific platform:"
echo "  flutter run -d android"
echo "  flutter run -d ios"
echo "  flutter run -d chrome"

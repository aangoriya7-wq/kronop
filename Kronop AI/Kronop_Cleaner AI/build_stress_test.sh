#!/bin/bash

# Build script for Kronop Cleaner AI Stress Test Suite
echo "Building Kronop Cleaner AI Stress Test Suite..."

# Create build directory
mkdir -p build
cd build

# Configure with CMake
echo "Configuring with CMake..."
cmake .. -DCMAKE_BUILD_TYPE=Release

# Build the stress test
echo "Building stress test..."
make stress_test_suite

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "Running stress test..."
    ./stress_test_suite
else
    echo "❌ Build failed!"
    exit 1
fi

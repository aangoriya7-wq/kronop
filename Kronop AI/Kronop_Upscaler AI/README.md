# Kronop AI Video Upscaler

एक high-performance C++ video upscaler जो Bicubic Interpolation और Deep Learning का उपयोग करके real-time video enhancement करता है।

## Features

- **Bicubic Interpolation**: High-quality pixel interpolation for smooth upscaling
- **Deep Learning Enhancement**: AI-based pixel enhancement using neural networks
- **Vulkan GPU Acceleration**: Real-time processing with Vulkan compute shaders
- **Anti-aliasing**: Advanced edge smoothing and artifact reduction
- **Missing Pixel Recovery**: Intelligent filling of corrupted or missing pixels

## Architecture

### Core Components

1. **Upscale_Core.cpp**: Main upscaling engine with Vulkan integration
2. **Pixel_Interpolation.hpp**: AI-powered pixel interpolation algorithms
3. **main.cpp**: Test application and entry point

### Key Algorithms

- Bicubic interpolation with 4x4 kernel
- 3-layer neural network for pixel enhancement
- Weighted averaging for missing pixel recovery
- Gaussian anti-aliasing filter

## Installation

### Dependencies
```bash
make install-deps
```

### Build
```bash
make
```

### Test
```bash
make test
```

## Usage

```cpp
UpscaleCore* upscaler = createUpscaler();
initializeUpscaler(upscaler);

std::vector<float> inputFrame = loadImage("input.png");
std::vector<float> outputFrame;

processFrame(upscaler, inputFrame.data(), width, height, outputFrame.data());

saveImage("output.png", outputFrame);
destroyUpscaler(upscaler);
```

## Performance

- **Input Resolution**: 640x480
- **Output Resolution**: 1280x960 (2x upscaling)
- **Processing Time**: <50ms per frame (with Vulkan GPU)
- **Memory Usage**: ~200MB for 1080p frames

## File Structure

```
Kronop_Upscaler AI/
├── Upscale_Core.cpp      # Main upscaling engine
├── Pixel_Interpolation.hpp # AI interpolation algorithms
├── main.cpp             # Test application
├── Makefile             # Build configuration
└── README.md            # This file
```

## Technical Details

### Bicubic Interpolation
Uses Mitchell-Netravali cubic spline with parameter a = -0.5 for optimal sharpness and artifact reduction.

### Neural Network
3-layer fully connected network:
- Input: 16 neurons (4x4 pixel patch)
- Hidden 1: 32 neurons with ReLU activation
- Hidden 2: 16 neurons with ReLU activation  
- Output: 4 neurons (RGBA pixel values)

### Vulkan Integration
- Compute shader for parallel pixel processing
- Memory-mapped buffers for zero-copy GPU access
- Command buffer optimization for real-time performance

## License

© 2024 Kronop AI. All rights reserved.

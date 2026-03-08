# Kronop Color Artist

एक advanced 3D LUT-based color grading system जो फीके रंगों को iPhone-style vibrant quality में बदल देता है।

## Features

- **3D LUT Color Grading**: 64x64x64 lookup table for precise color transformation
- **40-60% Color Boost**: Selective color enhancement with configurable boost factors
- **iPhone-style Vibrance**: Advanced vibrance algorithm for natural color enhancement
- **Skin Tone Preservation**: Intelligent skin tone detection and preservation
- **Vulkan GPU Acceleration**: Real-time color processing with compute shaders
- **Cinematic Grading**: Professional color grading with S-curves and temperature shifts

## Architecture

### Core Components

1. **Color_Core.cpp**: Main color grading engine with Vulkan integration
2. **LUT_Table.hpp**: 3D LUT generation and color transformation algorithms
3. **color_grade.comp**: Vulkan compute shader for GPU-accelerated processing
4. **main.cpp**: Test application with comprehensive color grading tests

### Key Algorithms

- **3D Trilinear Interpolation**: Smooth color transitions in LUT space
- **HSV Color Space Manipulation**: Better control over saturation and vibrance
- **Selective Color Boosting**: Different boost factors for warm/cool/neutral tones
- **Skin Tone Detection**: Hue-based detection with preservation logic

## Installation

### Dependencies
```bash
make install-deps
```

### Build
```bash
make all
```

### Test
```bash
make test
```

## Usage

```cpp
ColorArtist* artist = createColorArtist();
initializeColorArtist(artist);

// Apply 50% color boost
applyColorGrading(artist, inputImage, width, height, outputImage, 1.5f);

// Apply 60% color boost for more vibrant results
applyColorGrading(artist, inputImage, width, height, outputImage, 1.6f);

destroyColorArtist(artist);
```

## Color Enhancement Features

### 1. Color Boost Levels
- **40% Boost** (1.4x): Subtle enhancement
- **50% Boost** (1.5x): Balanced enhancement
- **60% Boost** (1.6x): Vibrant enhancement

### 2. Selective Color Processing
- **Warm Tones** (Reds/Oranges): Enhanced with emphasis on red channel
- **Cool Tones** (Blues/Cyans): Enhanced with emphasis on blue channel
- **Greens**: Enhanced with emphasis on green channel
- **Neutral Colors**: Balanced enhancement across all channels

### 3. iPhone-style Vibrance
- More effect on less saturated colors
- Preserves already vibrant areas
- Natural-looking color enhancement
- Subtle brightness adjustment

### 4. Skin Tone Preservation
- Detects skin tones using HSV color space
- Applies subtle enhancement only
- Maintains natural skin appearance
- Prevents over-saturation

### 5. Cinematic Grading
- S-curve contrast adjustment
- Warm temperature shift
- Highlight roll-off
- Film-like appearance

## Performance

- **Input Resolution**: Up to 4K (3840x2160)
- **Processing Time**: <20ms for 1080p (with Vulkan GPU)
- **Memory Usage**: ~500MB for 4K frames
- **LUT Size**: 64x64x64 (1MB VRAM)

## File Structure

```
Kronop_Color_Artist/
├── Color_Core.cpp        # Main color grading engine
├── LUT_Table.hpp        # 3D LUT generation algorithms
├── color_grade.comp     # Vulkan compute shader
├── main.cpp            # Test application
├── Makefile            # Build configuration
└── README.md           # This file
```

## Technical Details

### 3D LUT Generation
The system generates a 64x64x64 lookup table with:
- iPhone-style vibrance enhancement
- Selective color boosting
- Cinematic color grading
- Skin tone preservation

### Vulkan Compute Shader
- 16x16 workgroups for optimal GPU utilization
- Trilinear interpolation for smooth LUT lookup
- Push constants for dynamic parameters
- Zero-copy memory mapping for performance

### Color Space Conversions
- RGB to HSV for better color manipulation
- HSV to RGB for final output
- YUV conversion for saturation control
- Gamma correction for display

## Test Results

The system includes comprehensive tests:
- **Color Quality Test**: Validates color enhancement accuracy
- **Skin Tone Test**: Ensures natural skin tone preservation
- **Vibrance Test**: Tests iPhone-style vibrance enhancement
- **Performance Test**: Measures GPU acceleration performance

## Output Files

Test runs generate several output files:
- `color_test_output.raw`: General color grading test
- `skin_tone_test.raw`: Skin tone preservation test
- `vibrance_test.raw`: Vibrance enhancement test

## License

© 2024 Kronop AI. All rights reserved.

---

## Hindi Notes

यह system फीके रंगों को iPhone जैसी vibrant quality में बदलने के लिए बनाया गया है:

- **40-60% Color Boost**: रंगों को 40% से 60% तक boost करता है
- **3D LUT**: 64x64x64 lookup table के साथ precise color transformation
- **Vulkan GPU**: Real-time processing के लिए GPU acceleration
- **Skin Tone Preservation**: Skin tones को natural रखते हुए enhancement

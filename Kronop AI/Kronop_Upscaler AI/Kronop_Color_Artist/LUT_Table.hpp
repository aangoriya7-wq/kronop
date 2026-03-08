#pragma once
#include <vector>
#include <cmath>
#include <algorithm>
#include <iostream>

class LUTTable {
private:
    static constexpr int LUT_SIZE = 64;
    static constexpr float PI = 3.14159265359f;
    
    struct ColorRGB {
        float r, g, b;
        ColorRGB(float r = 0, float g = 0, float b = 0) : r(r), g(g), b(b) {}
    };
    
    struct HSV {
        float h, s, v;
        HSV(float h = 0, float s = 0, float v = 0) : h(h), s(s), v(v) {}
    };
    
public:
    LUTTable() {}
    
    std::vector<float> generateVibrantLUT(int size) {
        std::vector<float> lut(size * size * size * 4);
        
        for (int b = 0; b < size; ++b) {
            for (int g = 0; g < size; ++g) {
                for (int r = 0; r < size; ++r) {
                    int idx = ((b * size + g) * size + r) * 4;
                    
                    // Normalize input colors to 0-1 range
                    float inR = (float)r / (size - 1);
                    float inG = (float)g / (size - 1);
                    float inB = (float)b / (size - 1);
                    
                    // Apply iPhone-style vibrant color transformation
                    ColorRGB inputColor(inR, inG, inB);
                    ColorRGB enhancedColor = applyiPhoneVibrance(inputColor);
                    
                    // Apply additional color boost (40-60%)
                    ColorRGB boostedColor = applyColorBoost(enhancedColor, 1.5f);
                    
                    // Apply cinematic color grading
                    ColorRGB finalColor = applyCinematicGrading(boostedColor);
                    
                    // Store in LUT
                    lut[idx] = std::clamp(finalColor.r, 0.0f, 1.0f);
                    lut[idx + 1] = std::clamp(finalColor.g, 0.0f, 1.0f);
                    lut[idx + 2] = std::clamp(finalColor.b, 0.0f, 1.0f);
                    lut[idx + 3] = 1.0f; // Alpha always 1.0
                }
            }
        }
        
        std::cout << "Generated " << size << "x" << size << "x" << size << " vibrant LUT" << std::endl;
        return lut;
    }
    
private:
    ColorRGB applyiPhoneVibrance(const ColorRGB& input) {
        // Convert to HSV for better color manipulation
        HSV hsv = rgbToHSV(input);
        
        // iPhone-style vibrance enhancement
        float vibrance = 1.3f; // 30% vibrance boost
        
        // Increase saturation more for less saturated colors
        float saturationBoost = 1.0f + (vibrance - 1.0f) * (1.0f - hsv.s);
        hsv.s = std::clamp(hsv.s * saturationBoost, 0.0f, 1.0f);
        
        // Slight brightness adjustment for better contrast
        hsv.v = std::clamp(hsv.v * 1.05f, 0.0f, 1.0f);
        
        // Enhance certain hues (skin tones, blues, greens)
        if (hsv.h >= 0.0f && hsv.h <= 60.0f) { // Reds to Yellows
            hsv.s = std::clamp(hsv.s * 1.1f, 0.0f, 1.0f);
        } else if (hsv.h >= 180.0f && hsv.h <= 240.0f) { // Cyans to Blues
            hsv.s = std::clamp(hsv.s * 1.15f, 0.0f, 1.0f);
            hsv.v = std::clamp(hsv.v * 1.02f, 0.0f, 1.0f);
        } else if (hsv.h >= 90.0f && hsv.h <= 150.0f) { // Greens to Cyans
            hsv.s = std::clamp(hsv.s * 1.12f, 0.0f, 1.0f);
        }
        
        return hsvToRGB(hsv);
    }
    
    ColorRGB applyColorBoost(const ColorRGB& input, float boostFactor) {
        ColorRGB output;
        
        // Apply selective color boosting
        // Boost reds and oranges (warm tones)
        if (input.r > input.g && input.r > input.b) {
            output.r = std::clamp(input.r * boostFactor, 0.0f, 1.0f);
            output.g = std::clamp(input.g * (boostFactor * 0.8f), 0.0f, 1.0f);
            output.b = std::clamp(input.b * (boostFactor * 0.6f), 0.0f, 1.0f);
        }
        // Boost blues and cyans (cool tones)
        else if (input.b > input.r && input.b > input.g) {
            output.r = std::clamp(input.r * (boostFactor * 0.7f), 0.0f, 1.0f);
            output.g = std::clamp(input.g * (boostFactor * 0.9f), 0.0f, 1.0f);
            output.b = std::clamp(input.b * boostFactor, 0.0f, 1.0f);
        }
        // Boost greens
        else if (input.g > input.r && input.g > input.b) {
            output.r = std::clamp(input.r * (boostFactor * 0.8f), 0.0f, 1.0f);
            output.g = std::clamp(input.g * boostFactor, 0.0f, 1.0f);
            output.b = std::clamp(input.b * (boostFactor * 0.7f), 0.0f, 1.0f);
        }
        // Neutral colors - balanced boost
        else {
            output.r = std::clamp(input.r * boostFactor, 0.0f, 1.0f);
            output.g = std::clamp(input.g * boostFactor, 0.0f, 1.0f);
            output.b = std::clamp(input.b * boostFactor, 0.0f, 1.0f);
        }
        
        return output;
    }
    
    ColorRGB applyCinematicGrading(const ColorRGB& input) {
        ColorRGB output;
        
        // Apply cinematic S-curve for contrast
        float contrast = 1.1f;
        float gamma = 0.9f;
        
        // Apply contrast curve
        output.r = std::pow((input.r - 0.5f) * contrast + 0.5f, gamma);
        output.g = std::pow((input.g - 0.5f) * contrast + 0.5f, gamma);
        output.b = std::pow((input.b - 0.5f) * contrast + 0.5f, gamma);
        
        // Apply subtle color temperature shift (warm cinematic look)
        float temperatureShift = 0.02f;
        output.r = std::clamp(output.r + temperatureShift, 0.0f, 1.0f);
        output.b = std::clamp(output.b - temperatureShift * 0.5f, 0.0f, 1.0f);
        
        // Apply film-like highlight roll-off
        float highlightRollOff = 0.8f;
        if (output.r > highlightRollOff) {
            output.r = highlightRollOff + (output.r - highlightRollOff) * 0.5f;
        }
        if (output.g > highlightRollOff) {
            output.g = highlightRollOff + (output.g - highlightRollOff) * 0.5f;
        }
        if (output.b > highlightRollOff) {
            output.b = highlightRollOff + (output.b - highlightRollOff) * 0.5f;
        }
        
        return output;
    }
    
    HSV rgbToHSV(const ColorRGB& rgb) {
        float maxVal = std::max({rgb.r, rgb.g, rgb.b});
        float minVal = std::min({rgb.r, rgb.g, rgb.b});
        float delta = maxVal - minVal;
        
        HSV hsv;
        hsv.v = maxVal;
        
        if (delta < 0.00001f) {
            hsv.h = 0;
            hsv.s = 0;
            return hsv;
        }
        
        hsv.s = delta / maxVal;
        
        if (maxVal == rgb.r) {
            hsv.h = 60.0f * ((rgb.g - rgb.b) / delta);
            if (hsv.h < 0) hsv.h += 360.0f;
        } else if (maxVal == rgb.g) {
            hsv.h = 60.0f * ((rgb.b - rgb.r) / delta + 2.0f);
        } else {
            hsv.h = 60.0f * ((rgb.r - rgb.g) / delta + 4.0f);
        }
        
        return hsv;
    }
    
    ColorRGB hsvToRGB(const HSV& hsv) {
        float c = hsv.v * hsv.s;
        float x = c * (1.0f - std::abs(std::fmod(hsv.h / 60.0f, 2.0f) - 1.0f));
        float m = hsv.v - c;
        
        float r, g, b;
        
        if (hsv.h >= 0 && hsv.h < 60) {
            r = c; g = x; b = 0;
        } else if (hsv.h >= 60 && hsv.h < 120) {
            r = x; g = c; b = 0;
        } else if (hsv.h >= 120 && hsv.h < 180) {
            r = 0; g = c; b = x;
        } else if (hsv.h >= 180 && hsv.h < 240) {
            r = 0; g = x; b = c;
        } else if (hsv.h >= 240 && hsv.h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        return ColorRGB(r + m, g + m, b + m);
    }
    
    // Additional utility functions for advanced color processing
    
    ColorRGB applySkinToneEnhancement(const ColorRGB& input) {
        HSV hsv = rgbToHSV(input);
        
        // Detect skin tones (roughly 0-60 degrees in HSV)
        if (hsv.h >= 0.0f && hsv.h <= 60.0f && hsv.s >= 0.2f && hsv.s <= 0.8f && hsv.v >= 0.3f && hsv.v <= 0.9f) {
            // Enhance skin tones subtly
            hsv.s = std::clamp(hsv.s * 1.05f, 0.0f, 1.0f);
            hsv.v = std::clamp(hsv.v * 1.02f, 0.0f, 1.0f);
            
            // Slight warmth adjustment
            if (hsv.h > 45.0f) {
                hsv.h = std::clamp(hsv.h - 2.0f, 0.0f, 60.0f);
            }
        }
        
        return hsvToRGB(hsv);
    }
    
    ColorRGB applyBlueSkyEnhancement(const ColorRGB& input) {
        HSV hsv = rgbToHSV(input);
        
        // Detect sky blues (roughly 180-240 degrees)
        if (hsv.h >= 180.0f && hsv.h <= 240.0f && hsv.s >= 0.3f && hsv.v >= 0.5f) {
            // Enhance sky blues
            hsv.s = std::clamp(hsv.s * 1.2f, 0.0f, 1.0f);
            hsv.v = std::clamp(hsv.v * 1.1f, 0.0f, 1.0f);
            
            // Shift towards deeper blue
            hsv.h = std::clamp(hsv.h + 5.0f, 180.0f, 240.0f);
        }
        
        return hsvToRGB(hsv);
    }
    
    ColorRGB applyGreenFoliageEnhancement(const ColorRGB& input) {
        HSV hsv = rgbToHSV(input);
        
        // Detect foliage greens (roughly 90-150 degrees)
        if (hsv.h >= 90.0f && hsv.h <= 150.0f && hsv.s >= 0.2f && hsv.v >= 0.2f && hsv.v <= 0.8f) {
            // Enhance greens
            hsv.s = std::clamp(hsv.s * 1.15f, 0.0f, 1.0f);
            hsv.v = std::clamp(hsv.v * 1.05f, 0.0f, 1.0f);
            
            // Shift towards vibrant green
            hsv.h = std::clamp(hsv.h + 3.0f, 90.0f, 150.0f);
        }
        
        return hsvToRGB(hsv);
    }
    
public:
    // Public interface for advanced color enhancements
    ColorRGB applySelectiveEnhancement(const ColorRGB& input) {
        ColorRGB enhanced = input;
        
        // Apply skin tone enhancement
        enhanced = applySkinToneEnhancement(enhanced);
        
        // Apply sky enhancement
        enhanced = applyBlueSkyEnhancement(enhanced);
        
        // Apply foliage enhancement
        enhanced = applyGreenFoliageEnhancement(enhanced);
        
        return enhanced;
    }
    
    // Generate specialized LUTs for different scenarios
    std::vector<float> generatePortraitLUT(int size) {
        std::vector<float> lut(size * size * size * 4);
        
        for (int b = 0; b < size; ++b) {
            for (int g = 0; g < size; ++g) {
                for (int r = 0; r < size; ++r) {
                    int idx = ((b * size + g) * size + r) * 4;
                    
                    float inR = (float)r / (size - 1);
                    float inG = (float)g / (size - 1);
                    float inB = (float)b / (size - 1);
                    
                    ColorRGB inputColor(inR, inG, inB);
                    ColorRGB enhancedColor = applyiPhoneVibrance(inputColor);
                    ColorRGB portraitColor = applySkinToneEnhancement(enhancedColor);
                    ColorRGB finalColor = applyCinematicGrading(portraitColor);
                    
                    lut[idx] = std::clamp(finalColor.r, 0.0f, 1.0f);
                    lut[idx + 1] = std::clamp(finalColor.g, 0.0f, 1.0f);
                    lut[idx + 2] = std::clamp(finalColor.b, 0.0f, 1.0f);
                    lut[idx + 3] = 1.0f;
                }
            }
        }
        
        return lut;
    }
    
    std::vector<float> generateLandscapeLUT(int size) {
        std::vector<float> lut(size * size * size * 4);
        
        for (int b = 0; b < size; ++b) {
            for (int g = 0; g < size; ++g) {
                for (int r = 0; r < size; ++r) {
                    int idx = ((b * size + g) * size + r) * 4;
                    
                    float inR = (float)r / (size - 1);
                    float inG = (float)g / (size - 1);
                    float inB = (float)b / (size - 1);
                    
                    ColorRGB inputColor(inR, inG, inB);
                    ColorRGB enhancedColor = applyiPhoneVibrance(inputColor);
                    ColorRGB landscapeColor = applySelectiveEnhancement(enhancedColor);
                    ColorRGB finalColor = applyCinematicGrading(landscapeColor);
                    
                    lut[idx] = std::clamp(finalColor.r, 0.0f, 1.0f);
                    lut[idx + 1] = std::clamp(finalColor.g, 0.0f, 1.0f);
                    lut[idx + 2] = std::clamp(finalColor.b, 0.0f, 1.0f);
                    lut[idx + 3] = 1.0f;
                }
            }
        }
        
        return lut;
    }
};

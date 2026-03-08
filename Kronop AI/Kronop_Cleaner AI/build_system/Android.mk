# Android.mk for Kronop Cleaner AI
# ARM64 Optimized Native Video Processing Library with Vulkan & NEON

LOCAL_PATH := $(call my-dir)

include $(CLEAR_VARS)

# Module name
LOCAL_MODULE := libkronop_cleaner

# Source files - Complete list
LOCAL_SRC_FILES := \
    KronopNativeInterface.cpp \
    ARM64_Optimized_Processing.cpp \
    Deblur_Core.cpp \
    ChunkManager.cpp \
    Dynamic_PSF/OpticalFlow.cpp \
    Smart_Sharpening/SmartSharpening.cpp \
    Advanced_Shaders/ComputeShaders.cpp \
    VulkanCompute.cpp \
    VulkanShaderCompiler.cpp \
    Security_Shield.cpp \
    AudioVideoSync.cpp \
    VideoStreamer.cpp

# Include directories
LOCAL_C_INCLUDES := \
    $(LOCAL_PATH) \
    $(LOCAL_PATH)/Dynamic_PSF \
    $(LOCAL_PATH)/Smart_Sharpening \
    $(LOCAL_PATH)/Advanced_Shaders \
    $(NDK_ROOT)/sources/android/native_app_glue \
    $(NDK_ROOT)/sysroot/usr/include \
    $(LOCAL_PATH)/third_party/fftw3/include

# Compiler flags for ARM64 optimization
LOCAL_CPPFLAGS := \
    -std=c++17 \
    -O3 \
    -ffast-math \
    -funroll-loops \
    -march=armv8-a \
    -mtune=cortex-a76 \
    -ftree-vectorize \
    -funsafe-math-optimizations \
    -fomit-frame-pointer \
    -DNDEBUG \
    -DANDROID_ARM_NEON=1 \
    -D__ARM_NEON \
    -DKRONOP_ANDROID_BUILD \
    -fPIC \
    -Wall \
    -Wextra \
    -Wno-unused-parameter

# Linker flags - Complete dependencies
LOCAL_LDLIBS := \
    -llog \
    -landroid \
    -ljnigraphics \
    -lGLESv3 \
    -lEGL \
    -lvulkan \
    -lfftw3f \
    -lm \
    -lpthread \
    -ldl

# Prebuilt libraries (if needed)
LOCAL_STATIC_LIBRARIES := \
    fftw3f_static

# Enable ARM64 NEON
LOCAL_ARM_NEON := true

# Target architecture (ARM64 only for maximum performance)
LOCAL_TARGET_ARCH := arm64-v8a

# STL
LOCAL_CPP_STL := c++_shared

# Disable RTTI and exceptions for performance
LOCAL_CPPFLAGS += -fno-rtti -fno-exceptions

# LTO (Link Time Optimization) for better performance
LOCAL_LDFLAGS += -flto

# Build as shared library
include $(BUILD_SHARED_LIBRARY)

# Additional build targets for testing
include $(CLEAR_VARS)
LOCAL_MODULE := kronop_tests
LOCAL_SRC_FILES := \
    test_framework.cpp \
    run_tests.cpp \
    simple_stress_test.cpp \
    stress_test_suite.cpp
LOCAL_C_INCLUDES := $(LOCAL_C_INCLUDES)
LOCAL_CPPFLAGS := $(LOCAL_CPPFLAGS) -DBUILD_TESTS
LOCAL_LDLIBS := $(LOCAL_LDLIBS) -L$(LOCAL_PATH) -lkronop_cleaner
LOCAL_TARGET_ARCH := arm64-v8a
LOCAL_CPP_STL := c++_shared
include $(BUILD_EXECUTABLE)

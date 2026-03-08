# Application.mk for Kronop Cleaner AI
# ARM64 Optimized Build Configuration

# Target platform
APP_PLATFORM := android-21  # Android 5.0+ (Lollipop)

# Target architectures
APP_ABI := arm64-v8a

# STL implementation
APP_STL := c++_static

# Build mode
APP_OPTIM := release

# Compiler flags
APP_CPPFLAGS := \
    -std=c++17 \
    -O3 \
    -ffast-math \
    -funroll-loops \
    -march=armv8-a \
    -mtune=cortex-a76 \
    -ftree-vectorize \
    -funsafe-math-optimizations \
    -DNDEBUG \
    -DANDROID_ARM_NEON=1

# Enable exceptions and RTTI
APP_CPPFLAGS += -frtti -fexceptions

# Linker optimization
APP_LDFLAGS := \
    -Wl,--gc-sections \
    -Wl,--exclude-libs,libgcc.a \
    -Wl,--exclude-libs,libstdc++.a

# Build with PIE (Position Independent Executable)
APP_PIE := true

# Thin archives
APP_THIN_ARCHIVE := true

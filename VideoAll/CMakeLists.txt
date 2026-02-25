cmake_minimum_required(VERSION 3.15)
project(VideoAll VERSION 1.0.0 LANGUAGES C CXX ASM)

# Options
option(BUILD_ANDROID "Build Android version" OFF)
option(BUILD_IOS "Build iOS version" OFF)
option(BUILD_WASM "Build WebAssembly version" OFF)
option(ENABLE_TESTS "Enable testing" ON)

# Include directories
include_directories(include)

# Find packages
find_package(PkgConfig REQUIRED)
pkg_check_modules(FFMPEG REQUIRED libavcodec libavformat libavutil libswscale)

# Assembly files
if(CMAKE_SYSTEM_PROCESSOR MATCHES "x86_64|amd64")
    set(ASM_FILES
        decoder.asm
    )
    enable_language(ASM)
endif()

# C++ engine
add_library(engine SHARED engine.cpp)
target_link_libraries(engine ${FFMPEG_LIBRARIES})
target_include_directories(engine PRIVATE ${FFMPEG_INCLUDE_DIRS})

# Rust memory guard
find_program(CARGO_EXECUTABLE cargo REQUIRED)
add_custom_target(rust_build ALL
    COMMAND ${CARGO_EXECUTABLE} build --release
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    COMMENT "Building Rust memory guard"
)

# Go fetcher
find_program(GO_EXECUTABLE go REQUIRED)
add_custom_target(go_build ALL
    COMMAND ${GO_EXECUTABLE} build -buildmode=c-shared -o libfetcher.so fetcher.go
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    COMMENT "Building Go fetcher"
)

# Python AI
set(PYTHON_FILES
    ai_logic.py
)

# Kotlin (Android)
if(BUILD_ANDROID)
    add_subdirectory(android)
endif()

# Swift (iOS)
if(BUILD_IOS)
    add_subdirectory(ios)
endif()

# WebAssembly
if(BUILD_WASM)
    add_subdirectory(wasm)
endif()

# SQL
set(SQL_FILES
    progress.sql
)

# Executable
add_executable(video_player main.cpp)
target_link_libraries(video_player engine)

# Tests
if(ENABLE_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

# Installation
install(TARGETS video_player DESTINATION bin)
install(FILES ${ASM_FILES} ${PYTHON_FILES} ${SQL_FILES} DESTINATION share/videoall)

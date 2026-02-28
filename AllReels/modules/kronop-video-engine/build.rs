//! Build script for Kronop Video Engine
//! 
//! Handles FFmpeg linking and compilation

use std::env;
use std::path::PathBuf;

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    
    // Set target
    let target = env::var("TARGET").unwrap();
    let is_android = target.contains("android");
    let is_ios = target.contains("ios") || target.contains("apple");
    
    // FFmpeg configuration
    if is_android {
        configure_ffmpeg_android();
    } else if is_ios {
        configure_ffmpeg_ios();
    } else {
        configure_ffmpeg_desktop();
    }
    
    // Link system libraries
    link_system_libraries(&target);
    
    // Emit metadata
    emit_metadata();
}

fn configure_ffmpeg_android() {
    println!("cargo:warning=Configuring FFmpeg for Android");
    
    // For Android, we'll use pre-built FFmpeg libraries
    // These should be placed in the appropriate Android NDK library path
    
    let ffmpeg_lib_path = PathBuf::from("libs/android");
    
    if ffmpeg_lib_path.exists() {
        println!("cargo:rustc-link-search=native={}", ffmpeg_lib_path.display());
        println!("cargo:rustc-link-lib=static=avcodec");
        println!("cargo:rustc-link-lib=static=avformat");
        println!("cargo:rustc-link-lib=static=avutil");
        println!("cargo:rustc-link-lib=static=swscale");
        println!("cargo:rustc-link-lib=static=swresample");
    } else {
        println!("cargo:warning=FFmpeg libraries not found at {}. Using pkg-config.", ffmpeg_lib_path.display());
        configure_ffmpeg_pkg_config();
    }
}

fn configure_ffmpeg_ios() {
    println!("cargo:warning=Configuring FFmpeg for iOS");
    
    // For iOS, we'll use pre-built FFmpeg libraries
    let ffmpeg_lib_path = PathBuf::from("libs/ios");
    
    if ffmpeg_lib_path.exists() {
        println!("cargo:rustc-link-search=native={}", ffmpeg_lib_path.display());
        println!("cargo:rustc-link-lib=static=avcodec");
        println!("cargo:rustc-link-lib=static=avformat");
        println!("cargo:rustc-link-lib=static=avutil");
        println!("cargo:rustc-link-lib=static=swscale");
        println!("cargo:rustc-link-lib=static=swresample");
    } else {
        println!("cargo:warning=FFmpeg libraries not found at {}. Using pkg-config.", ffmpeg_lib_path.display());
        configure_ffmpeg_pkg_config();
    }
}

fn configure_ffmpeg_desktop() {
    println!("cargo:warning=Configuring FFmpeg for Desktop");
    configure_ffmpeg_pkg_config();
}

fn configure_ffmpeg_pkg_config() {
    // Try to use pkg-config to find FFmpeg
    pkg_config::Config::new()
        .statik(true)
        .probe("libavcodec")
        .unwrap_or_else(|_| {
            println!("cargo:warning=libavcodec not found via pkg-config");
            None
        });
    
    pkg_config::Config::new()
        .statik(true)
        .probe("libavformat")
        .unwrap_or_else(|_| {
            println!("cargo:warning=libavformat not found via pkg-config");
            None
        });
    
    pkg_config::Config::new()
        .statik(true)
        .probe("libavutil")
        .unwrap_or_else(|_| {
            println!("cargo:warning=libavutil not found via pkg-config");
            None
        });
    
    pkg_config::Config::new()
        .statik(true)
        .probe("libswscale")
        .unwrap_or_else(|_| {
            println!("cargo:warning=libswscale not found via pkg-config");
            None
        });
    
    pkg_config::Config::new()
        .statik(true)
        .probe("libswresample")
        .unwrap_or_else(|_| {
            println!("cargo:warning=libswresample not found via pkg-config");
            None
        });
}

fn link_system_libraries(target: &str) {
    if target.contains("windows") {
        // Windows-specific libraries
        println!("cargo:rustc-link-lib=ws2_32");
        println!("cargo:rustc-link-lib=user32");
        println!("cargo:rustc-link-lib=kernel32");
        println!("cargo:rustc-link-lib=advapi32");
    } else if target.contains("linux") {
        // Linux-specific libraries
        println!("cargo:rustc-link-lib=pthread");
        println!("cargo:rustc-link-lib=m");
        println!("cargo:rustc-link-lib=dl");
    } else if target.contains("darwin") {
        // macOS/iOS-specific libraries
        println!("cargo:rustc-link-lib=framework=Foundation");
        println!("cargo:rustc-link-lib=framework=CoreVideo");
        println!("cargo:rustc-link-lib=framework=CoreMedia");
        println!("cargo:rustc-link-lib=framework=AVFoundation");
        println!("cargo:rustc-link-lib=framework=VideoToolbox");
    } else if target.contains("android") {
        // Android-specific libraries
        println!("cargo:rustc-link-lib=log");
        println!("cargo:rustc-link-lib=android");
    }
    
    // Common libraries for all platforms
    println!("cargo:rustc-link-lib=pthread");
}

fn emit_metadata() {
    // Emit build metadata for the crate
    println!("cargo:metadata=kronop_video_engine_version=0.1.0");
    println!("cargo:metadata=kronop_video_engine_build_date={}", 
             chrono::Utc::now().format("%Y-%m-%d %H:%M:%S"));
}

//! Build script for Kronop Video Engine
//! Compiles Rust code for React Native integration

fn main() {
    println!("cargo:rerun-if-changed=src/lib.rs");
    println!("cargo:rerun-if-changed=src/video_decoder.rs");
    println!("cargo:rerun-if-changed=src/vulkan_renderer.rs");
    println!("cargo:rerun-if-changed=src/memory_pool.rs");
    println!("cargo:rerun-if-changed=src/jsi_bridge.rs");
    println!("cargo:rerun-if-changed=src/exoplayer_integration.rs");

    // Link with Android libraries
    #[cfg(target_os = "android")]
    {
        println!("cargo:rustc-link-lib=android");
        println!("cargo:rustc-link-lib=log");
        println!("cargo:rustc-link-lib=jnigraphics");
        
        // Link with ExoPlayer native libraries
        println!("cargo:rustc-link-lib=exoplayer");
        println!("cargo:rustc-link-lib=mediacodec");
        
        // Vulkan libraries
        println!("cargo:rustc-link-lib=vulkan");
    }

    // iOS libraries
    #[cfg(target_os = "ios")]
    {
        println!("cargo:rustc-link-lib=framework=VideoToolbox");
        println!("cargo:rustc-link-lib=framework=CoreVideo");
        println!("cargo:rustc-link-lib=framework=Metal");
        println!("cargo:rustc-link-lib=framework=AVFoundation");
    }

    // Enable optimizations for release builds
    if !cfg!(debug_assertions) {
        println!("cargo:rustc-cdylib-link-arg=-O3");
        println!("cargo:rustc-cdylib-link-arg=-flto");
        println!("cargo:rustc-cdylib-link-arg=-march=native");
    }

    // Set target-specific flags
    #[cfg(target_arch = "aarch64")]
    {
        println!("cargo:rustc-cdylib-link-arg=-mcpu=apple-a14");
    }

    #[cfg(target_arch = "arm")]
    {
        println!("cargo:rustc-cdylib-link-arg=-mcpu=cortex-a78");
    }

    // Enable position-independent code for shared library
    println!("cargo:rustc-cdylib-link-arg=-fPIC");
}

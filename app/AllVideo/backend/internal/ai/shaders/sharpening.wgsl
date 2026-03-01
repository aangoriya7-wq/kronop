// Kronop Sharpening Filter - WGSL Shader
// 
// Real-time anti-aliasing and sharpening for ultra-sharp video rendering
// GPU-accelerated processing for mobile devices
// Optimized for performance and battery efficiency

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
};

struct Uniforms {
    strength: f32,
    anti_aliasing: f32,
    mode: f32,
    adaptive_quality: f32,
    padding: vec3<f32>,
};

@group(0) @binding(0) var input_texture: texture_2d<f32>;
@group(0) @binding(1) var output_texture: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;
@group(0) @binding(3) var texture_sampler: sampler;

// Vertex shader
@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    var output: VertexOutput;
    
    // Create a full-screen quad
    let x = f32(i32(vertex_index) - 1);
    let y = f32(i32(vertex_index & 1u) * 2 - 1);
    
    output.position = vec4<f32>(x, y, 0.0, 1.0);
    output.tex_coords = vec2<f32>((x + 1.0) * 0.5, (y + 1.0) * 0.5);
    
    return output;
}

// Fragment shader with advanced sharpening
@fragment
fn fs_main(@location(0) tex_coords: vec2<f32>) -> vec4<f32> {
    let texel_size = vec2<f32>(1.0) / vec2<f32>(textureDimensions(input_texture));
    
    // Sample surrounding pixels for sharpening
    let center = textureSample(input_texture, texture_sampler, tex_coords);
    let left = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(-texel_size.x, 0.0));
    let right = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(texel_size.x, 0.0));
    let top = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(0.0, -texel_size.y));
    let bottom = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(0.0, texel_size.y));
    
    // Diagonal samples for better quality
    let top_left = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(-texel_size.x, -texel_size.y));
    let top_right = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(texel_size.x, -texel_size.y));
    let bottom_left = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(-texel_size.x, texel_size.y));
    let bottom_right = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(texel_size.x, texel_size.y));
    
    // Calculate sharpening based on mode
    var sharpened: vec4<f32>;
    
    if (uniforms.mode >= 2.0) {
        // Ultra-sharp mode - 3x3 kernel
        sharpened = apply_ultra_sharpen(center, left, right, top, bottom, top_left, top_right, bottom_left, bottom_right);
    } else if (uniforms.mode >= 1.0) {
        // Balanced mode - 5-point cross
        sharpened = apply_balanced_sharpen(center, left, right, top, bottom);
    } else {
        // Performance mode - simple sharpening
        sharpened = apply_performance_sharpen(center, left, right, top, bottom);
    }
    
    // Apply anti-aliasing if enabled
    if (uniforms.anti_aliasing > 0.5) {
        sharpened = apply_anti_aliasing_filter(center, sharpened, uniforms.anti_aliasing);
    }
    
    // Adaptive quality adjustment
    if (uniforms.adaptive_quality > 0.5) {
        sharpened = apply_adaptive_quality(sharpened, center);
    }
    
    // Ensure values are in valid range
    sharpened = clamp(sharpened, vec4<f32>(0.0), vec4<f32>(1.0));
    
    // Write to output texture
    textureStore(output_texture, vec2<i32>(tex_coords * vec2<f32>(textureDimensions(input_texture))), sharpened);
    
    return sharpened;
}

// Ultra-sharp mode - 3x3 convolution kernel
fn apply_ultra_sharpen(
    center: vec4<f32>,
    left: vec4<f32>,
    right: vec4<f32>,
    top: vec4<f32>,
    bottom: vec4<f32>,
    top_left: vec4<f32>,
    top_right: vec4<f32>,
    bottom_left: vec4<f32>,
    bottom_right: vec4<f32>
) -> vec4<f32> {
    // Unsharp mask with 3x3 kernel
    let kernel = mat3x3<f32>(
        -0.05, -0.1, -0.05,
        -0.1,  1.8,  -0.1,
        -0.05, -0.1, -0.05
    );
    
    let strength = uniforms.strength;
    
    // Apply convolution
    var result: vec4<f32> = vec4<f32>(0.0);
    result += top_left * kernel[0][0];
    result += top * kernel[0][1];
    result += top_right * kernel[0][2];
    result += left * kernel[1][0];
    result += center * kernel[1][1];
    result += right * kernel[1][2];
    result += bottom_left * kernel[2][0];
    result += bottom * kernel[2][1];
    result += bottom_right * kernel[2][2];
    
    // Apply strength
    result = mix(center, result, strength);
    
    return result;
}

// Balanced mode - 5-point cross kernel
fn apply_balanced_sharpen(
    center: vec4<f32>,
    left: vec4<f32>,
    right: vec4<f32>,
    top: vec4<f32>,
    bottom: vec4<f32>
) -> vec4<f32> {
    // 5-point cross kernel
    let strength = uniforms.strength * 0.7;
    
    // Calculate Laplacian
    let laplacian = (left + right + top + bottom) - (4.0 * center);
    
    // Apply sharpening
    let result = center + (laplacian * strength);
    
    return result;
}

// Performance mode - simple sharpening
fn apply_performance_sharpen(
    center: vec4<f32>,
    left: vec4<f32>,
    right: vec4<f32>,
    top: vec4<f32>,
    bottom: vec4<f32>
) -> vec4<f32> {
    let strength = uniforms.strength * 0.5;
    
    // Simple edge enhancement
    let horizontal = abs(left - right);
    let vertical = abs(top - bottom);
    let edge_strength = max(horizontal, vertical);
    
    let result = center + (edge_strength * strength * 0.25);
    
    return result;
}

// Anti-aliasing filter
fn apply_anti_aliasing_filter(
    original: vec4<f32>,
    sharpened: vec4<f32>,
    strength: f32
) -> vec4<f32> {
    // Blend original with sharpened to reduce artifacts
    let blend_factor = 0.3 * strength;
    let result = mix(original, sharpened, 1.0 - blend_factor);
    
    return result;
}

// Adaptive quality adjustment
fn apply_adaptive_quality(
    sharpened: vec4<f32>,
    original: vec4<f32>
) -> vec4<f32> {
    // Detect if sharpening is creating artifacts
    let difference = abs(sharpened - original);
    let max_diff = max(difference.r, max(difference.g, difference.b));
    
    // Reduce sharpening if artifacts are detected
    let artifact_threshold = 0.1;
    if (max_diff > artifact_threshold) {
        let reduction = 1.0 - ((max_diff - artifact_threshold) * 5.0);
        return mix(original, sharpened, reduction);
    }
    
    return sharpened;
}

// Advanced edge detection for better sharpening
fn detect_edges(tex_coords: vec2<f32>) -> f32 {
    let texel_size = vec2<f32>(1.0) / vec2<f32>(textureDimensions(input_texture));
    
    // Sobel operator
    let tl = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(-texel_size.x, -texel_size.y));
    let tm = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(0.0, -texel_size.y));
    let tr = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(texel_size.x, -texel_size.y));
    let ml = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(-texel_size.x, 0.0));
    let mm = textureSample(input_texture, texture_sampler, tex_coords);
    let mr = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(texel_size.x, 0.0));
    let bl = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(-texel_size.x, texel_size.y));
    let bm = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(0.0, texel_size.y));
    let br = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(texel_size.x, texel_size.y));
    
    // Convert to grayscale for edge detection
    let tl_gray = dot(tl.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let tm_gray = dot(tm.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let tr_gray = dot(tr.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let ml_gray = dot(ml.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let mr_gray = dot(mr.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let bl_gray = dot(bl.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let bm_gray = dot(bm.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let br_gray = dot(br.rgb, vec3<f32>(0.299, 0.587, 0.114));
    
    // Sobel X
    let sobel_x = (tr_gray + 2.0 * mr_gray + br_gray) - (tl_gray + 2.0 * ml_gray + bl_gray);
    
    // Sobel Y
    let sobel_y = (bl_gray + 2.0 * bm_gray + br_gray) - (tl_gray + 2.0 * tm_gray + tr_gray);
    
    // Edge magnitude
    let edge_magnitude = sqrt(sobel_x * sobel_x + sobel_y * sobel_y);
    
    return edge_magnitude;
}

// Noise reduction for cleaner output
fn reduce_noise(pixel: vec4<f32>, neighbors: array<vec4<f32>, 8>) -> vec4<f32> {
    var sum = vec4<f32>(0.0);
    for (var i = 0; i < 8; i = i + 1) {
        sum = sum + neighbors[i];
    }
    let mean = sum / 8.0;
    
    // Bilateral filter approximation
    let spatial_weight = 0.5;
    let intensity_weight = 0.5;
    
    let spatial_diff = 1.0;
    let intensity_diff = distance(pixel, mean);
    
    let weight = exp(-spatial_diff * spatial_weight) * exp(-intensity_diff * intensity_weight);
    
    return mix(pixel, mean, weight);
}

// HDR tone mapping for better dynamic range
fn tone_map(color: vec4<f32>) -> vec4<f32> {
    // ACES filmic tone mapping approximation
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;
    
    let mapped = (color * (color * a + b)) / (color * (color * c + d) + e);
    
    return clamp(mapped, vec4<f32>(0.0), vec4<f32>(1.0));
}

// Color preservation during sharpening
fn preserve_colors(original: vec4<f32>, sharpened: vec4<f32>) -> vec4<f32> {
    // Extract luminance
    let original_luma = dot(original.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let sharpened_luma = dot(sharpened.rgb, vec3<f32>(0.299, 0.587, 0.114));
    
    // Calculate color ratios
    let original_ratios = original.rgb / max(original_luma, 0.001);
    let sharpened_ratios = sharpened.rgb / max(sharpened_luma, 0.001);
    
    // Blend color ratios to preserve natural colors
    let blended_ratios = mix(original_ratios, sharpened_ratios, 0.5);
    
    // Apply blended ratios to sharpened luminance
    let result = vec4<f32>(blended_ratios * sharpened_luma, sharpened.a);
    
    return result;
}

// Final composition with all effects
fn compose_final(
    original: vec4<f32>,
    sharpened: vec4<f32>,
    tex_coords: vec2<f32>
) -> vec4<f32> {
    // Apply edge-aware sharpening
    let edge_strength = detect_edges(tex_coords);
    let adaptive_strength = uniforms.strength * (1.0 + edge_strength * 0.5);
    
    // Apply adaptive sharpening
    let adaptive_sharpened = mix(original, sharpened, adaptive_strength);
    
    // Preserve colors
    let color_preserved = preserve_colors(original, adaptive_sharpened);
    
    // Apply tone mapping
    let tone_mapped = tone_map(color_preserved);
    
    // Final anti-aliasing
    let final_result = apply_anti_aliasing_filter(original, tone_mapped, uniforms.anti_aliasing);
    
    return final_result;
}

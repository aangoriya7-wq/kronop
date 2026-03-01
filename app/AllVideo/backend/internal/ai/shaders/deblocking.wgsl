// Kronop De-blocking Filter - WGSL Shader
// 
// Real-time pixelation removal and smoothing for low-quality videos
// AI-powered de-blocking for seamless video enhancement
// GPU-accelerated processing for mobile devices
// Optimized for performance and edge preservation

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) tex_coords: vec2<f32>,
};

struct Uniforms {
    strength: f32,
    adaptive_threshold: f32,
    preserve_edges: f32,
    mode: f32,
    smooth_blocks: f32,
    detect_artifacts: f32,
    padding: f32,
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

// Fragment shader with advanced de-blocking
@fragment
fn fs_main(@location(0) tex_coords: vec2<f32>) -> vec4<f32> {
    let texel_size = vec2<f32>(1.0) / vec2<f32>(textureDimensions(input_texture));
    
    // Sample surrounding pixels for de-blocking analysis
    let center = textureSample(input_texture, texture_sampler, tex_coords);
    let left = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(-texel_size.x, 0.0));
    let right = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(texel_size.x, 0.0));
    let top = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(0.0, -texel_size.y));
    let bottom = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(0.0, texel_size.y));
    
    // Extended sampling for block detection
    let top_left = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(-texel_size.x, -texel_size.y));
    let top_right = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(texel_size.x, -texel_size.y));
    let bottom_left = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(-texel_size.x, texel_size.y));
    let bottom_right = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(texel_size.x, texel_size.y));
    
    // Detect pixelation artifacts
    let pixelation_level = detect_pixelation_artifacts(center, left, right, top, bottom, top_left, top_right, bottom_left, bottom_right);
    
    // Apply de-blocking based on mode
    var deblocked: vec4<f32>;
    
    if (uniforms.mode >= 3.0) {
        // Aggressive mode - maximum de-blocking
        deblocked = apply_aggressive_deblocking(center, left, right, top, bottom, top_left, top_right, bottom_left, bottom_right);
    } else if (uniforms.mode >= 2.0) {
        // Balanced mode - edge-aware de-blocking
        deblocked = apply_balanced_deblocking(center, left, right, top, bottom, top_left, top_right, bottom_left, bottom_right);
    } else if (uniforms.mode >= 1.0) {
        // Gentle mode - light smoothing
        deblocked = apply_gentle_deblocking(center, left, right, top, bottom);
    } else {
        // Adaptive mode - AI-driven de-blocking
        deblocked = apply_adaptive_deblocking(center, left, right, top, bottom, top_left, top_right, bottom_left, bottom_right, pixelation_level);
    }
    
    // Apply edge preservation if enabled
    if (uniforms.preserve_edges > 0.5) {
        deblocked = preserve_edges(center, deblocked);
    }
    
    // Ensure values are in valid range
    deblocked = clamp(deblocked, vec4<f32>(0.0), vec4<f32>(1.0));
    
    // Write to output texture
    textureStore(output_texture, vec2<i32>(tex_coords * vec2<f32>(textureDimensions(input_texture))), deblocked);
    
    return deblocked;
}

// Detect pixelation artifacts
fn detect_pixelation_artifacts(
    center: vec4<f32>,
    left: vec4<f32>,
    right: vec4<f32>,
    top: vec4<f32>,
    bottom: vec4<f32>,
    top_left: vec4<f32>,
    top_right: vec4<f32>,
    bottom_left: vec4<f32>,
    bottom_right: vec4<f32>
) -> f32 {
    // Calculate color variance in neighborhood
    let neighbors = array<vec4<f32>, 8>(
        left, right, top, bottom, top_left, top_right, bottom_left, bottom_right
    );
    
    var variance = 0.0;
    for (var i = 0; i < 8; i = i + 1) {
        let diff = distance(center.rgb, neighbors[i].rgb);
        variance = variance + diff;
    }
    variance = variance / 8.0;
    
    // High variance indicates potential pixelation
    return saturate(variance / uniforms.adaptive_threshold);
}

// Aggressive de-blocking for heavily pixelated content
fn apply_aggressive_deblocking(
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
    // Strong bilateral filter with large kernel
    let kernel = array<f32, 9>(
        0.05, 0.1, 0.05,
        0.1,  0.4,  0.1,
        0.05, 0.1, 0.05
    );
    
    var result = vec4<f32>(0.0);
    var weight_sum = 0.0;
    
    let samples = array<vec4<f32>, 9>(
        top_left, top, top_right,
        left, center, right,
        bottom_left, bottom, bottom_right
    );
    
    for (var i = 0; i < 9; i = i + 1) {
        let spatial_weight = kernel[i];
        
        // Intensity weight for bilateral filtering
        let intensity_diff = distance(center.rgb, samples[i].rgb);
        let intensity_weight = exp(-intensity_diff * intensity_diff / (2.0 * 0.1 * 0.1));
        
        let total_weight = spatial_weight * intensity_weight * uniforms.strength;
        
        result = result + samples[i] * total_weight;
        weight_sum = weight_sum + total_weight;
    }
    
    if (weight_sum > 0.0) {
        result = result / weight_sum;
    } else {
        result = center;
    }
    
    return result;
}

// Balanced de-blocking with edge preservation
fn apply_balanced_deblocking(
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
    // Edge-aware bilateral filter
    var result = vec4<f32>(0.0);
    var weight_sum = 0.0;
    
    // Calculate edge weights
    let edge_weights = array<f32, 8>(
        calculate_edge_weight(center, left),
        calculate_edge_weight(center, right),
        calculate_edge_weight(center, top),
        calculate_edge_weight(center, bottom),
        calculate_edge_weight(center, top_left),
        calculate_edge_weight(center, top_right),
        calculate_edge_weight(center, bottom_left),
        calculate_edge_weight(center, bottom_right)
    );
    
    let samples = array<vec4<f32>, 8>(
        left, right, top, bottom, top_left, top_right, bottom_left, bottom_right
    );
    
    for (var i = 0; i < 8; i = i + 1) {
        let spatial_weight = 0.125; // Equal spatial weight
        let edge_weight = edge_weights[i];
        
        // Intensity weight
        let intensity_diff = distance(center.rgb, samples[i].rgb);
        let intensity_weight = exp(-intensity_diff * intensity_diff / (2.0 * 0.05 * 0.05));
        
        let total_weight = spatial_weight * edge_weight * intensity_weight * uniforms.strength;
        
        result = result + samples[i] * total_weight;
        weight_sum = weight_sum + total_weight;
    }
    
    // Add center pixel with reduced weight
    result = result + center * 0.2;
    weight_sum = weight_sum + 0.2;
    
    if (weight_sum > 0.0) {
        result = result / weight_sum;
    } else {
        result = center;
    }
    
    return result;
}

// Gentle de-blocking for mild artifacts
fn apply_gentle_deblocking(
    center: vec4<f32>,
    left: vec4<f32>,
    right: vec4<f32>,
    top: vec4<f32>,
    bottom: vec4<f32>
) -> vec4<f32> {
    // Simple 5-point smoothing
    let kernel = array<f32, 5>(
        0.1, 0.2, 0.4, 0.2, 0.1
    );
    
    let samples = array<vec4<f32>, 5>(left, top, center, bottom, right);
    
    var result = vec4<f32>(0.0);
    for (var i = 0; i < 5; i = i + 1) {
        result = result + samples[i] * kernel[i] * uniforms.strength;
    }
    
    // Blend with original
    result = mix(center, result, 0.5);
    
    return result;
}

// Adaptive de-blocking based on detected artifacts
fn apply_adaptive_deblocking(
    center: vec4<f32>,
    left: vec4<f32>,
    right: vec4<f32>,
    top: vec4<f32>,
    bottom: vec4<f32>,
    top_left: vec4<f32>,
    top_right: vec4<f32>,
    bottom_left: vec4<f32>,
    bottom_right: vec4<f32>,
    pixelation_level: f32
) -> vec4<f32> {
    // Adapt de-blocking strength based on detected pixelation
    let adaptive_strength = uniforms.strength * pixelation_level;
    
    if (pixelation_level > 0.7) {
        // Heavy pixelation - use aggressive de-blocking
        return apply_aggressive_deblocking(center, left, right, top, bottom, top_left, top_right, bottom_left, bottom_right);
    } else if (pixelation_level > 0.3) {
        // Moderate pixelation - use balanced de-blocking
        return apply_balanced_deblocking(center, left, right, top, bottom, top_left, top_right, bottom_left, bottom_right);
    } else {
        // Light pixelation - use gentle de-blocking
        return apply_gentle_deblocking(center, left, right, top, bottom);
    }
}

// Calculate edge weight for preservation
fn calculate_edge_weight(center: vec4<f32>, neighbor: vec4<f32>) -> f32 {
    let gradient = distance(center.rgb, neighbor.rgb);
    
    // Lower weight for strong edges (preserve them)
    return 1.0 / (1.0 + gradient * 10.0);
}

// Preserve edges during de-blocking
fn preserve_edges(original: vec4<f32>, processed: vec4<f32>) -> vec4<f32> {
    // Detect edges using Sobel operator
    let edge_strength = detect_edge_strength(original);
    
    // Blend based on edge strength
    let blend_factor = saturate(edge_strength * 2.0);
    
    return mix(processed, original, blend_factor);
}

// Detect edge strength using Sobel operator
fn detect_edge_strength(pixel: vec4<f32>) -> f32 {
    let texel_size = vec2<f32>(1.0) / vec2<f32>(textureDimensions(input_texture));
    let coords = vec2<f32>(0.5, 0.5); // Assuming we're processing the center
    
    // Sobel X
    let tl = textureSample(input_texture, texture_sampler, coords + vec2<f32>(-texel_size.x, -texel_size.y));
    let tm = textureSample(input_texture, texture_sampler, coords + vec2<f32>(0.0, -texel_size.y));
    let tr = textureSample(input_texture, texture_sampler, coords + vec2<f32>(texel_size.x, -texel_size.y));
    let ml = textureSample(input_texture, texture_sampler, coords + vec2<f32>(-texel_size.x, 0.0));
    let mr = textureSample(input_texture, texture_sampler, coords + vec2<f32>(texel_size.x, 0.0));
    let bl = textureSample(input_texture, texture_sampler, coords + vec2<f32>(-texel_size.x, texel_size.y));
    let bm = textureSample(input_texture, texture_sampler, coords + vec2<f32>(0.0, texel_size.y));
    let br = textureSample(input_texture, texture_sampler, coords + vec2<f32>(texel_size.x, texel_size.y));
    
    // Convert to grayscale
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
    
    return saturate(edge_magnitude);
}

// Block boundary smoothing
fn smooth_block_boundaries(
    center: vec4<f32>,
    tex_coords: vec2<f32>
) -> vec4<f32> {
    let texel_size = vec2<f32>(1.0) / vec2<f32>(textureDimensions(input_texture));
    
    // Check if we're near a block boundary (8x8 blocks)
    let block_size = 8.0;
    let block_coords = tex_coords * vec2<f32>(textureDimensions(input_texture)) / block_size;
    let block_fraction = fract(block_coords);
    
    var is_near_boundary = false;
    if (block_fraction.x < 0.1 || block_fraction.x > 0.9 ||
        block_fraction.y < 0.1 || block_fraction.y > 0.9) {
        is_near_boundary = true;
    }
    
    if (is_near_boundary && uniforms.smooth_blocks > 0.5) {
        // Apply stronger smoothing near block boundaries
        let kernel = array<f32, 9>(
            0.111, 0.111, 0.111,
            0.111, 0.111, 0.111,
            0.111, 0.111, 0.111
        );
        
        var result = vec4<f32>(0.0);
        for (var dy = -1; dy <= 1; dy = dy + 1) {
            for (var dx = -1; dx <= 1; dx = dx + 1) {
                let sample = textureSample(input_texture, texture_sampler, tex_coords + vec2<f32>(dx, dy) * texel_size);
                result = result + sample * kernel[(dy + 1) * 3 + (dx + 1)];
            }
        }
        
        return result;
    } else {
        return center;
    }
}

// Advanced noise reduction
fn reduce_noise(pixel: vec4<f32>, neighbors: array<vec4<f32>, 8>) -> vec4<f32> {
    var sum = vec4<f32>(0.0);
    var weight_sum = 0.0;
    
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

// Color preservation during de-blocking
fn preserve_colors(original: vec4<f32>, processed: vec4<f32>) -> vec4<f32> {
    // Extract luminance
    let original_luma = dot(original.rgb, vec3<f32>(0.299, 0.587, 0.114));
    let processed_luma = dot(processed.rgb, vec3<f32>(0.299, 0.587, 0.114));
    
    // Calculate color ratios
    let original_ratios = original.rgb / max(original_luma, 0.001);
    let processed_ratios = processed.rgb / max(processed_luma, 0.001);
    
    // Blend color ratios to preserve natural colors
    let blended_ratios = mix(original_ratios, processed_ratios, 0.7);
    
    // Apply blended ratios to processed luminance
    let result = vec4<f32>(blended_ratios * processed_luma, processed.a);
    
    return result;
}

// Final composition with all de-blocking effects
fn compose_final(
    original: vec4<f32>,
    processed: vec4<f32>,
    tex_coords: vec2<f32>
) -> vec4<f32> {
    // Apply block boundary smoothing
    let boundary_smoothed = smooth_block_boundaries(processed, tex_coords);
    
    // Preserve colors during de-blocking
    let color_preserved = preserve_colors(original, boundary_smoothed);
    
    // Final edge preservation
    let final_result = preserve_edges(original, color_preserved);
    
    return final_result;
}

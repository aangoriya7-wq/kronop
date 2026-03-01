/**
 * Kronop Sharpening Filter - Rust Implementation
 * 
 * Real-time anti-aliasing and sharpening for ultra-sharp video rendering
 * Removes blur and enhances video quality frame by frame
 * Optimized for mobile devices with GPU acceleration
 * 
 * Features:
 * - Real-time sharpening filter
 * - Anti-aliasing algorithms
 * - GPU-accelerated processing
 * - Adaptive quality adjustment
 * - Battery optimization
 */

use std::f32;
use image::{ImageBuffer, Rgb};
use wgpu::*;

pub struct SharpeningFilter {
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipeline: wgpu::RenderPipeline,
    bind_group_layout: wgpu::BindGroupLayout,
    sampler: wgpu::Sampler,
}

#[derive(Debug, Clone, Copy)]
pub struct SharpeningConfig {
    pub strength: f32,
    pub anti_aliasing: bool,
    pub mode: RenderingMode,
    pub adaptive_quality: bool,
}

#[derive(Debug, Clone, Copy)]
pub enum RenderingMode {
    UltraSharp,
    Balanced,
    Performance,
}

impl Default for SharpeningConfig {
    fn default() -> Self {
        Self {
            strength: 0.8,
            anti_aliasing: true,
            mode: RenderingMode::UltraSharp,
            adaptive_quality: true,
        }
    }
}

impl SharpeningFilter {
    pub async fn new() -> Result<Self, Box<dyn std::error::Error>> {
        // Initialize WGPU device
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::all(),
            dx12_shader_compiler: Default::default(),
        });

        let adapter = instance.request_adapter(&wgpu::RequestAdapterOptions {
            power_preference: wgpu::PowerPreference::HighPerformance,
            compatible_surface: None,
            force_fallback_adapter: false,
        }).await.ok_or("Failed to create adapter")?;

        let (device, queue) = adapter.request_device(
            &wgpu::DeviceDescriptor {
                label: Some("Sharpening Filter Device"),
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::downlevel_defaults(),
            },
            None,
        ).await?;

        // Create shader
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Sharpening Shader"),
            source: wgpu::ShaderSource::Wgsl(include_str!("sharpening.wgsl").into()),
        });

        // Create bind group layout
        let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("Sharpening Bind Group Layout"),
            entries: &[
                // Input texture
                wgpu::BindGroupLayoutEntry {
                    binding: 0,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Texture {
                        multisampled: false,
                        view_dimension: wgpu::TextureViewDimension::D2,
                        sample_type: wgpu::TextureSampleType::Float { filterable: true },
                    },
                    count: None,
                },
                // Output texture
                wgpu::BindGroupLayoutEntry {
                    binding: 1,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::StorageTexture {
                        access: wgpu::StorageTextureAccess::WriteOnly,
                        format: wgpu::TextureFormat::Rgba8Unorm,
                        view_dimension: wgpu::TextureViewDimension::D2,
                    },
                    count: None,
                },
                // Uniform buffer
                wgpu::BindGroupLayoutEntry {
                    binding: 2,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Buffer {
                        ty: wgpu::BufferBindingType::Uniform,
                        has_dynamic_offset: false,
                        min_binding_size: None,
                    },
                    count: None,
                },
                // Sampler
                wgpu::BindGroupLayoutEntry {
                    binding: 3,
                    visibility: wgpu::ShaderStages::FRAGMENT,
                    ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                    count: None,
                },
            ],
        });

        // Create pipeline
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: Some("Sharpening Pipeline Layout"),
            bind_group_layouts: &[&bind_group_layout],
            push_constant_ranges: &[],
        });

        let pipeline = device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
            label: Some("Sharpening Pipeline"),
            layout: Some(&pipeline_layout),
            vertex: wgpu::VertexState {
                module: &shader,
                entry_point: "vs_main",
                buffers: &[],
            },
            fragment: Some(wgpu::FragmentState {
                module: &shader,
                entry_point: "fs_main",
                targets: &[Some(wgpu::ColorTargetState {
                    format: wgpu::TextureFormat::Rgba8Unorm,
                    blend: None,
                    write_mask: wgpu::ColorWrites::ALL,
                })],
            }),
            primitive: wgpu::PrimitiveState {
                topology: wgpu::PrimitiveTopology::TriangleList,
                strip_index_format: None,
                front_face: wgpu::FrontFace::Ccw,
                cull_mode: None,
                polygon_mode: wgpu::PolygonMode::Fill,
                unclipped_depth: false,
                conservative: false,
            },
            depth_stencil: None,
            multisample: wgpu::MultisampleState {
                count: 1,
                mask: !0,
                alpha_to_coverage_enabled: false,
            },
            multiview: None,
        });

        // Create sampler
        let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("Sharpening Sampler"),
            address_mode_u: wgpu::AddressMode::ClampToEdge,
            address_mode_v: wgpu::AddressMode::ClampToEdge,
            address_mode_w: wgpu::AddressMode::ClampToEdge,
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            mipmap_filter: wgpu::FilterMode::Linear,
            ..Default::default()
        });

        Ok(Self {
            device,
            queue,
            pipeline,
            bind_group_layout,
            sampler,
        })
    }

    pub fn apply_sharpening(
        &self,
        input_image: &ImageBuffer<Rgb<u8>, Vec<u8>>,
        config: SharpeningConfig,
    ) -> Result<ImageBuffer<Rgb<u8>, Vec<u8>>, Box<dyn std::error::Error>> {
        let (width, height) = input_image.dimensions();
        
        // Create input texture
        let input_texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Input Texture"),
            size: wgpu::Extent3d {
                width: width,
                height: height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8Unorm,
            usage: wgpu::TextureUsages::TEXTURE_BINDING | wgpu::TextureUsages::COPY_DST,
            view_formats: &[],
        });

        // Create output texture
        let output_texture = self.device.create_texture(&wgpu::TextureDescriptor {
            label: Some("Output Texture"),
            size: wgpu::Extent3d {
                width: width,
                height: height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Rgba8Unorm,
            usage: wgpu::TextureUsages::STORAGE_BINDING | wgpu::TextureUsages::COPY_SRC,
            view_formats: &[],
        });

        // Convert RGB to RGBA for GPU processing
        let rgba_data: Vec<u8> = input_image
            .pixels()
            .flat_map(|p| [p[0], p[1], p[2], 255])
            .collect();

        // Write input data to texture
        self.queue.write_texture(
            wgpu::ImageCopyTexture {
                texture: &input_texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            &rgba_data,
            wgpu::ImageDataLayout {
                offset: 0,
                bytes_per_row: Some(width * 4),
                rows_per_image: Some(height),
            },
            wgpu::Extent3d {
                width: width,
                height: height,
                depth_or_array_layers: 1,
            },
        );

        // Create uniform buffer
        let uniform_data = self.create_uniform_buffer(config)?;
        
        // Create bind group
        let bind_group = self.device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Sharpening Bind Group"),
            layout: &self.bind_group_layout,
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: wgpu::BindingResource::TextureView(
                        &input_texture.create_view(&wgpu::TextureViewDescriptor::default())
                    ),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: wgpu::BindingResource::TextureView(
                        &output_texture.create_view(&wgpu::TextureViewDescriptor::default())
                    ),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: wgpu::BindingResource::Buffer(uniform_data.as_entire_buffer_binding()),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: wgpu::BindingResource::Sampler(&self.sampler),
                },
            ],
        });

        // Execute compute shader
        let command_encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Sharpening Command Encoder"),
        });

        {
            let mut render_pass = command_encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Sharpening Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &output_texture.create_view(&wgpu::TextureViewDescriptor::default()),
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color::BLACK),
                        store: true,
                    },
                })],
                depth_stencil_attachment: None,
                timestamp_writes: None,
                occlusion_query_set: None,
            });

            render_pass.set_pipeline(&self.pipeline);
            render_pass.set_bind_group(0, &bind_group, &[]);
            render_pass.draw(0..6, 0..1);
        }

        let command_buffer = command_encoder.finish();
        self.queue.submit(Some(command_buffer));

        // Read back output texture
        let output_data = self.read_texture(&output_texture, width, height)?;

        // Convert RGBA back to RGB
        let rgb_output: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::from_raw(width, height, output_data)
            .ok_or("Failed to create output image")?
            .pixels()
            .map(|p| Rgb([p[0], p[1], p[2]]))
            .collect();

        Ok(rgb_output)
    }

    fn create_uniform_buffer(&self, config: SharpeningConfig) -> Result<wgpu::Buffer, Box<dyn std::error::Error>> {
        let uniform_data = UniformData {
            strength: config.strength,
            anti_aliasing: if config.anti_aliasing { 1.0 } else { 0.0 },
            mode: match config.mode {
                RenderingMode::UltraSharp => 2.0,
                RenderingMode::Balanced => 1.0,
                RenderingMode::Performance => 0.5,
            },
            adaptive_quality: if config.adaptive_quality { 1.0 } else { 0.0 },
            padding: [0.0; 3],
        };

        let buffer = self.device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Uniform Buffer"),
            contents: bytemuck::bytes_of(&uniform_data),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });

        Ok(buffer)
    }

    fn read_texture(&self, texture: &wgpu::Texture, width: u32, height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let buffer_size = (width * height * 4) as wgpu::BufferAddress;
        
        let buffer = self.device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Read Buffer"),
            size: buffer_size,
            usage: wgpu::BufferUsages::COPY_DST | wgpu::BufferUsages::MAP_READ,
            mapped_at_creation: false,
        });

        let command_encoder = self.device.create_command_encoder(&wgpu::CommandEncoderDescriptor {
            label: Some("Read Command Encoder"),
        });

        command_encoder.copy_texture_to_buffer(
            wgpu::ImageCopyTexture {
                texture: texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            wgpu::ImageCopyBuffer {
                buffer: &buffer,
                layout: wgpu::ImageDataLayout {
                    offset: 0,
                    bytes_per_row: Some(width * 4),
                    rows_per_image: Some(height),
                },
            },
            wgpu::Extent3d {
                width: width,
                height: height,
                depth_or_array_layers: 1,
            },
        );

        let command_buffer = command_encoder.finish();
        self.queue.submit(Some(command_buffer));

        // Read buffer data
        let buffer_slice = buffer.slice(..);
        buffer_slice.map_async(wgpu::MapMode::Read, ());
        self.device.poll(wgpu::Maintain::Wait);
        
        let data = buffer_slice.get_mapped_range().to_vec();
        buffer.unmap();

        Ok(data)
    }
}

#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
struct UniformData {
    strength: f32,
    anti_aliasing: f32,
    mode: f32,
    adaptive_quality: f32,
    padding: [f32; 3],
}

// CPU-based sharpening fallback
pub fn apply_cpu_sharpening(
    image: &ImageBuffer<Rgb<u8>, Vec<u8>>,
    config: SharpeningConfig,
) -> ImageBuffer<Rgb<u8>, Vec<u8>> {
    let (width, height) = image.dimensions();
    let mut output = image.clone();

    // Unsharp mask algorithm
    let kernel_size = match config.mode {
        RenderingMode::UltraSharp => 5,
        RenderingMode::Balanced => 3,
        RenderingMode::Performance => 3,
    };

    let kernel = create_sharpening_kernel(kernel_size, config.strength);

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let mut sum = [0.0; 3];
            let mut kernel_sum = 0.0;

            for ky in 0..kernel_size {
                for kx in 0..kernel_size {
                    let px = x as i32 + kx as i32 - kernel_size as i32 / 2;
                    let py = y as i32 + ky as i32 - kernel_size as i32 / 2;

                    if px >= 0 && px < width as i32 && py >= 0 && py < height as i32 {
                        let pixel = image.get_pixel(px as u32, py as u32);
                        let weight = kernel[ky * kernel_size + kx];
                        
                        sum[0] += pixel[0] as f32 * weight;
                        sum[1] += pixel[1] as f32 * weight;
                        sum[2] += pixel[2] as f32 * weight;
                        kernel_sum += weight;
                    }
                }
            }

            if kernel_sum > 0.0 {
                let original = image.get_pixel(x, y);
                let sharpened = [
                    (sum[0] / kernel_sum).clamp(0.0, 255.0) as u8,
                    (sum[1] / kernel_sum).clamp(0.0, 255.0) as u8,
                    (sum[2] / kernel_sum).clamp(0.0, 255.0) as u8,
                ];

                // Apply anti-aliasing if enabled
                let final_pixel = if config.anti_aliasing {
                    apply_anti_aliasing(&original, &sharpened)
                } else {
                    sharpened
                };

                output.put_pixel(x, y, Rgb(final_pixel));
            }
        }
    }

    output
}

fn create_sharpening_kernel(size: usize, strength: f32) -> Vec<f32> {
    let mut kernel = vec![0.0; size * size];
    let center = size / 2;

    // Create Gaussian blur kernel
    for y in 0..size {
        for x in 0..size {
            let dx = x as f32 - center as f32;
            let dy = y as f32 - center as f32;
            let distance = (dx * dx + dy * dy).sqrt();
            let sigma = size as f32 / 3.0;
            kernel[y * size + x] = (-distance * distance / (2.0 * sigma * sigma)).exp();
        }
    }

    // Normalize kernel
    let sum: f32 = kernel.iter().sum();
    for value in &mut kernel {
        *value /= sum;
    }

    // Convert to unsharp mask
    for i in 0..kernel.len() {
        if i == center * size + center {
            kernel[i] = 1.0 + strength * (1.0 - kernel[i]);
        } else {
            kernel[i] = -strength * kernel[i];
        }
    }

    kernel
}

fn apply_anti_aliasing(original: &[u8; 3], sharpened: &[u8; 3]) -> [u8; 3] {
    // Simple anti-aliasing - blend original with sharpened
    let blend_factor = 0.3;
    [
        (original[0] as f32 * (1.0 - blend_factor) + sharpened[0] as f32 * blend_factor) as u8,
        (original[1] as f32 * (1.0 - blend_factor) + sharpened[1] as f32 * blend_factor) as u8,
        (original[2] as f32 * (1.0 - blend_factor) + sharpened[2] as f32 * blend_factor) as u8,
    ]
}

// Performance monitoring
pub struct PerformanceMetrics {
    pub frames_processed: u64,
    pub average_processing_time: f32,
    pub peak_memory_usage: u64,
    pub gpu_utilization: f32,
}

impl PerformanceMetrics {
    pub fn new() -> Self {
        Self {
            frames_processed: 0,
            average_processing_time: 0.0,
            peak_memory_usage: 0,
            gpu_utilization: 0.0,
        }
    }

    pub fn update(&mut self, processing_time: f32, memory_usage: u64, gpu_util: f32) {
        self.frames_processed += 1;
        self.average_processing_time = (self.average_processing_time * (self.frames_processed - 1) as f32 + processing_time) / self.frames_processed as f32;
        self.peak_memory_usage = self.peak_memory_usage.max(memory_usage);
        self.gpu_utilization = gpu_util;
    }
}

// Battery optimization
pub fn optimize_for_battery(config: &mut SharpeningConfig, battery_level: f32) {
    if battery_level < 15.0 {
        // Low battery - reduce quality
        config.mode = RenderingMode::Performance;
        config.strength = (config.strength * 0.5).max(0.3);
        config.anti_aliasing = false;
    } else if battery_level < 30.0 {
        // Medium battery - balanced mode
        config.mode = RenderingMode::Balanced;
        config.strength = (config.strength * 0.7).max(0.5);
    }
    // High battery - keep ultra-sharp mode
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sharpening_kernel_creation() {
        let kernel = create_sharpening_kernel(3, 0.8);
        assert_eq!(kernel.len(), 9);
        
        // Check that center pixel has highest weight
        let center = kernel[4];
        assert!(center > 1.0);
    }

    #[test]
    fn test_anti_aliasing() {
        let original = [100, 100, 100];
        let sharpened = [150, 150, 150];
        let result = apply_anti_aliasing(&original, &sharpened);
        
        // Result should be between original and sharpened
        for i in 0..3 {
            assert!(result[i] >= original[i]);
            assert!(result[i] <= sharpened[i]);
        }
    }

    #[test]
    fn test_battery_optimization() {
        let mut config = SharpeningConfig::default();
        
        optimize_for_battery(&mut config, 10.0);
        assert!(matches!(config.mode, RenderingMode::Performance));
        assert!(config.strength < 0.8);
        assert!(!config.anti_aliasing);
        
        optimize_for_battery(&mut config, 50.0);
        assert!(matches!(config.mode, RenderingMode::UltraSharp));
    }
}

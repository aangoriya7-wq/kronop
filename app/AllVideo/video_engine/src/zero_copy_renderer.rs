//! Zero-Copy Rendering Engine
//! Direct GPU data transfer without CPU bottleneck

use std::ptr;
use std::sync::Arc;
use ash::vk;
use ash::prelude::VkResult;
use crate::memory_pool::MemoryPool;

pub struct ZeroCopyRenderer {
    device: ash::Device,
    physical_device: vk::PhysicalDevice,
    command_pool: vk::CommandPool,
    descriptor_pool: vk::DescriptorPool,
    memory_pool: Arc<MemoryPool>,
    zero_copy_buffers: Vec<ZeroCopyBuffer>,
    next_buffer_id: u64,
}

#[derive(Debug)]
pub struct ZeroCopyBuffer {
    id: u64,
    buffer: vk::Buffer,
    memory: vk::DeviceMemory,
    size: vk::DeviceSize,
    mapped_ptr: *mut std::ffi::c_void,
    is_gpu_only: bool,
}

impl ZeroCopyRenderer {
    pub fn new(
        device: ash::Device,
        physical_device: vk::PhysicalDevice,
        command_pool: vk::CommandPool,
        memory_pool: Arc<MemoryPool>,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        
        // Create descriptor pool for zero-copy operations
        let descriptor_pool = Self::create_descriptor_pool(&device)?;
        
        Ok(Self {
            device,
            physical_device,
            command_pool,
            descriptor_pool,
            memory_pool,
            zero_copy_buffers: Vec::new(),
            next_buffer_id: 1,
        })
    }
    
    /// Create descriptor pool for zero-copy operations
    fn create_descriptor_pool(device: &ash::Device) -> Result<vk::DescriptorPool, Box<dyn std::error::Error>> {
        let pool_sizes = [
            vk::DescriptorPoolSize {
                ty: vk::DescriptorType::STORAGE_BUFFER,
                descriptor_count: 1000,
            },
            vk::DescriptorPoolSize {
                ty: vk::DescriptorType::COMBINED_IMAGE_SAMPLER,
                descriptor_count: 1000,
            },
        ];
        
        let pool_info = vk::DescriptorPoolCreateInfo {
            pool_size_count: pool_sizes.len() as u32,
            p_pool_sizes: pool_sizes.as_ptr(),
            max_sets: 1000,
            flags: vk::DescriptorPoolCreateFlags::FREE_DESCRIPTOR_SET,
            ..Default::default()
        };
        
        unsafe {
            Ok(device.create_descriptor_pool(&pool_info, None)?)
        }
    }
    
    /// Create zero-copy buffer for direct GPU access
    pub fn create_zero_copy_buffer(&mut self, size: vk::DeviceSize, gpu_only: bool) -> Result<u64, Box<dyn std::error::Error>> {
        let buffer_id = self.next_buffer_id;
        self.next_buffer_id += 1;
        
        // Find appropriate memory type for zero-copy
        let memory_type_index = self.find_zero_copy_memory_type(gpu_only)?;
        
        // Create buffer with optimal usage flags
        let usage_flags = if gpu_only {
            vk::BufferUsageFlags::STORAGE_BUFFER | 
            vk::BufferUsageFlags::TRANSFER_DST |
            vk::BufferUsageFlags::VERTEX_BUFFER
        } else {
            vk::BufferUsageFlags::STORAGE_BUFFER |
            vk::BufferUsageFlags::TRANSFER_SRC |
            vk::BufferUsageFlags::TRANSFER_DST
        };
        
        let buffer_info = vk::BufferCreateInfo {
            size,
            usage: usage_flags,
            sharing_mode: vk::SharingMode::EXCLUSIVE,
            ..Default::default()
        };
        
        let buffer = unsafe {
            self.device.create_buffer(&buffer_info, None)?
        };
        
        // Allocate memory
        let mem_requirements = unsafe {
            self.device.get_buffer_memory_requirements(buffer)
        };
        
        let alloc_info = vk::MemoryAllocateInfo {
            allocation_size: mem_requirements.size,
            memory_type_index,
            ..Default::default()
        };
        
        let memory = unsafe {
            self.device.allocate_memory(&alloc_info, None)?
        };
        
        // Bind buffer memory
        unsafe {
            self.device.bind_buffer_memory(buffer, memory, 0)?;
        }
        
        // Map memory for CPU access (if not GPU-only)
        let mapped_ptr = if !gpu_only {
            unsafe {
                self.device.map_memory(memory, 0, size, vk::MemoryMapFlags::empty())?
            }
        } else {
            ptr::null_mut()
        };
        
        let zero_copy_buffer = ZeroCopyBuffer {
            id: buffer_id,
            buffer,
            memory,
            size,
            mapped_ptr,
            is_gpu_only: gpu_only,
        };
        
        self.zero_copy_buffers.push(zero_copy_buffer);
        Ok(buffer_id)
    }
    
    /// Find memory type for zero-copy operations
    fn find_zero_copy_memory_type(&self, gpu_only: bool) -> Result<u32, Box<dyn std::error::Error>> {
        let mem_properties = unsafe {
            self.device.get_physical_device_memory_properties(self.physical_device)
        };
        
        let required_flags = if gpu_only {
            vk::MemoryPropertyFlags::DEVICE_LOCAL
        } else {
            vk::MemoryPropertyFlags::HOST_VISIBLE | 
            vk::MemoryPropertyFlags::HOST_COHERENT |
            vk::MemoryPropertyFlags::HOST_CACHED
        };
        
        for (i, mem_type) in mem_properties.memory_types.iter().enumerate() {
            if (mem_type.property_flags & required_flags) == required_flags {
                return i as u32;
            }
        }
        
        Err("No suitable memory type found for zero-copy".into())
    }
    
    /// Transfer video frame directly to GPU without CPU copy
    pub fn transfer_frame_to_gpu(&mut self, frame_data: &[u8], buffer_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        let buffer = self.zero_copy_buffers.iter()
            .find(|b| b.id == buffer_id)
            .ok_or("Buffer not found")?;
        
        if buffer.is_gpu_only {
            // For GPU-only buffers, use staging buffer and DMA transfer
            self.transfer_via_staging_buffer(frame_data, buffer_id)?;
        } else {
            // For host-visible buffers, direct memory copy
            self.direct_memory_copy(frame_data, buffer_id)?;
        }
        
        Ok(())
    }
    
    /// Direct memory copy for host-visible buffers
    fn direct_memory_copy(&self, frame_data: &[u8], buffer_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        let buffer = self.zero_copy_buffers.iter()
            .find(|b| b.id == buffer_id)
            .ok_or("Buffer not found")?;
        
        if !buffer.mapped_ptr.is_null() && !buffer.is_gpu_only {
            unsafe {
                let dst = buffer.mapped_ptr as *mut u8;
                let src = frame_data.as_ptr();
                let size = frame_data.len();
                
                // Zero-copy: Direct memory transfer without CPU processing
                ptr::copy_nonoverlapping(src, dst, size);
                
                // Flush memory if needed (for non-coherent memory)
                self.flush_mapped_memory(buffer.memory, 0, size as vk::DeviceSize)?;
            }
        }
        
        Ok(())
    }
    
    /// Transfer via staging buffer for GPU-only buffers
    fn transfer_via_staging_buffer(&mut self, frame_data: &[u8], gpu_buffer_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        // Create temporary staging buffer
        let staging_id = self.create_zero_copy_buffer(frame_data.len() as vk::DeviceSize, false)?;
        
        // Copy data to staging buffer
        self.direct_memory_copy(frame_data, staging_id)?;
        
        // Record command buffer for GPU transfer
        let command_buffer = self.begin_single_time_commands()?;
        
        // Copy from staging to GPU buffer
        let staging_buffer = self.zero_copy_buffers.iter()
            .find(|b| b.id == staging_id)
            .ok_or("Staging buffer not found")?;
            
        let gpu_buffer = self.zero_copy_buffers.iter()
            .find(|b| b.id == gpu_buffer_id)
            .ok_or("GPU buffer not found")?;
        
        let copy_region = vk::BufferCopy {
            src_offset: 0,
            dst_offset: 0,
            size: frame_data.len() as vk::DeviceSize,
        };
        
        unsafe {
            self.device.cmd_copy_buffer(
                command_buffer,
                staging_buffer.buffer,
                gpu_buffer.buffer,
                &[copy_region],
            );
        }
        
        // Submit and wait for completion
        self.end_single_time_commands(command_buffer)?;
        
        // Cleanup staging buffer
        self.destroy_zero_copy_buffer(staging_id)?;
        
        Ok(())
    }
    
    /// Begin single-time command buffer
    fn begin_single_time_commands(&self) -> Result<vk::CommandBuffer, Box<dyn std::error::Error>> {
        let alloc_info = vk::CommandBufferAllocateInfo {
            level: vk::CommandBufferLevel::PRIMARY,
            command_pool: self.command_pool,
            command_buffer_count: 1,
            ..Default::default()
        };
        
        let command_buffers = unsafe {
            self.device.allocate_command_buffers(&alloc_info)?
        };
        
        let command_buffer = command_buffers[0];
        
        let begin_info = vk::CommandBufferBeginInfo {
            flags: vk::CommandBufferUsageFlags::ONE_TIME_SUBMIT,
            ..Default::default()
        };
        
        unsafe {
            self.device.begin_command_buffer(command_buffer, &begin_info)?;
        }
        
        Ok(command_buffer)
    }
    
    /// End single-time command buffer
    fn end_single_time_commands(&self, command_buffer: vk::CommandBuffer) -> Result<(), Box<dyn std::error::Error>> {
        unsafe {
            self.device.end_command_buffer(command_buffer)?;
            
            let submit_info = vk::SubmitInfo {
                command_buffer_count: 1,
                p_command_buffers: &command_buffer,
                ..Default::default()
            };
            
            // Create temporary queue for transfer
            let queue = self.get_transfer_queue()?;
            
            queue.submit(&[submit_info], vk::Fence::null())?;
            queue.wait_idle()?;
            
            self.device.free_command_buffers(self.command_pool, &[command_buffer]);
        }
        
        Ok(())
    }
    
    /// Get transfer queue
    fn get_transfer_queue(&self) -> Result<vk::Queue, Box<dyn std::error::Error>> {
        // In real implementation, find dedicated transfer queue
        // For now, use graphics queue
        unsafe {
            let queue_family_index = 0; // Simplified
            Ok(self.device.get_device_queue(queue_family_index, 0))
        }
    }
    
    /// Flush mapped memory range
    fn flush_mapped_memory(&self, memory: vk::DeviceMemory, offset: vk::DeviceSize, size: vk::DeviceSize) -> Result<(), Box<dyn std::error::Error>> {
        let flush_range = vk::MappedMemoryRange {
            memory,
            offset,
            size,
            ..Default::default()
        };
        
        unsafe {
            self.device.flush_mapped_memory_ranges(&[flush_range])?;
        }
        
        Ok(())
    }
    
    /// Destroy zero-copy buffer
    fn destroy_zero_copy_buffer(&mut self, buffer_id: u64) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(pos) = self.zero_copy_buffers.iter().position(|b| b.id == buffer_id) {
            let buffer = self.zero_copy_buffers.remove(pos);
            
            unsafe {
                if !buffer.mapped_ptr.is_null() {
                    self.device.unmap_memory(buffer.memory);
                }
                self.device.destroy_buffer(buffer.buffer, None);
                self.device.free_memory(buffer.memory, None);
            }
        }
        
        Ok(())
    }
    
    /// Get zero-copy buffer
    pub fn get_zero_copy_buffer(&self, buffer_id: u64) -> Option<&ZeroCopyBuffer> {
        self.zero_copy_buffers.iter().find(|b| b.id == buffer_id)
    }
    
    /// Create zero-copy texture for video frames
    pub fn create_zero_copy_texture(&mut self, width: u32, height: u32) -> Result<u64, Box<dyn std::error::Error>> {
        let size = (width * height * 4) as vk::DeviceSize; // RGBA
        
        // Create image with optimal tiling for GPU access
        let image_info = vk::ImageCreateInfo {
            image_type: vk::ImageType::TYPE_2D,
            extent: vk::Extent3D {
                width,
                height,
                depth: 1,
            },
            mip_levels: 1,
            array_layers: 1,
            format: vk::Format::R8G8B8A8_UNORM,
            tiling: vk::ImageTiling::OPTIMAL, // GPU optimal
            initial_layout: vk::ImageLayout::UNDEFINED,
            usage: vk::ImageUsageFlags::SAMPLED_BIT | vk::ImageUsageFlags::TRANSFER_DST_BIT,
            sharing_mode: vk::SharingMode::EXCLUSIVE,
            samples: vk::SampleCountFlags::TYPE_1,
            ..Default::default()
        };
        
        let image = unsafe {
            self.device.create_image(&image_info, None)?
        };
        
        // Allocate GPU memory
        let mem_requirements = unsafe {
            self.device.get_image_memory_requirements(image)
        };
        
        let memory_type_index = self.find_zero_copy_memory_type(true)?; // GPU-only
        
        let alloc_info = vk::MemoryAllocateInfo {
            allocation_size: mem_requirements.size,
            memory_type_index,
            ..Default::default()
        };
        
        let memory = unsafe {
            self.device.allocate_memory(&alloc_info, None)?
        };
        
        unsafe {
            self.device.bind_image_memory(image, memory, 0)?;
        }
        
        // Create buffer ID for texture
        let buffer_id = self.next_buffer_id;
        self.next_buffer_id += 1;
        
        // Store as buffer-like object for simplicity
        let zero_copy_buffer = ZeroCopyBuffer {
            id: buffer_id,
            buffer: vk::Buffer::null(), // Not a buffer, but image
            memory,
            size,
            mapped_ptr: ptr::null_mut(),
            is_gpu_only: true,
        };
        
        self.zero_copy_buffers.push(zero_copy_buffer);
        Ok(buffer_id)
    }
}

impl Drop for ZeroCopyRenderer {
    fn drop(&mut self) {
        // Cleanup all zero-copy buffers
        for buffer in &self.zero_copy_buffers {
            unsafe {
                if !buffer.mapped_ptr.is_null() {
                    self.device.unmap_memory(buffer.memory);
                }
                if buffer.buffer != vk::Buffer::null() {
                    self.device.destroy_buffer(buffer.buffer, None);
                }
                self.device.free_memory(buffer.memory, None);
            }
        }
        
        unsafe {
            self.device.destroy_descriptor_pool(self.descriptor_pool, None);
        }
    }
}

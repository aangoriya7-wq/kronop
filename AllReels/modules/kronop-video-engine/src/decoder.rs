//! Video decoder module using FFmpeg
//! 
//! Handles decoding of video chunks into YUV/RGB frames with hardware acceleration

use std::ffi::{CStr, CString};
use std::ptr;
use std::slice;
use log::{info, error, debug, warn};
use anyhow::{Result, anyhow};

/// Video decoder using FFmpeg with hardware acceleration
pub struct VideoDecoder {
    /// FFmpeg format context
    format_context: *mut ffmpeg_sys_next::AVFormatContext,
    /// FFmpeg codec context
    codec_context: *mut ffmpeg_sys_next::AVCodecContext,
    /// FFmpeg frame
    frame: *mut ffmpeg_sys_next::AVFrame,
    /// FFmpeg packet
    packet: *mut ffmpeg_sys_next::AVPacket,
    /// Software scaler context
    sws_context: *mut ffmpeg_sys_next::SwsContext,
    /// Video stream index
    video_stream_index: isize,
    /// Current source URL
    source_url: String,
    /// Is initialized
    initialized: bool,
    /// Frame dimensions
    width: i32,
    height: i32,
    /// Output format (RGB or YUV)
    output_format: OutputFormat,
    /// Hardware acceleration type
    hw_accel: HardwareAcceleration,
}

/// Output format for decoded frames
#[derive(Debug, Clone, Copy)]
pub enum OutputFormat {
    YUV420P,
    RGB24,
    RGBA32,
}

/// Hardware acceleration options
#[derive(Debug, Clone, Copy)]
pub enum HardwareAcceleration {
    None,
    MediaCodec,  // Android
    VideoToolbox, // iOS
    CUDA,        // NVIDIA
    VAAPI,       // Linux
}

impl VideoDecoder {
    /// Create new video decoder
    pub fn new() -> Result<Self> {
        info!("Creating new video decoder with FFmpeg");
        
        // Initialize FFmpeg (call once globally)
        unsafe {
            ffmpeg_sys_next::av_register_all();
            ffmpeg_sys_next::avformat_network_init();
        }
        
        Ok(Self {
            format_context: ptr::null_mut(),
            codec_context: ptr::null_mut(),
            frame: ptr::null_mut(),
            packet: ptr::null_mut(),
            sws_context: ptr::null_mut(),
            video_stream_index: -1,
            source_url: String::new(),
            initialized: false,
            width: 0,
            height: 0,
            output_format: OutputFormat::RGB24,
            hw_accel: HardwareAcceleration::None,
        })
    }
    
    /// Create decoder with specific configuration
    pub fn with_config(output_format: OutputFormat, hw_accel: HardwareAcceleration) -> Result<Self> {
        let mut decoder = Self::new()?;
        decoder.output_format = output_format;
        decoder.hw_accel = hw_accel;
        Ok(decoder)
    }
    
    /// Set video source
    pub fn set_source(&mut self, url: &str) -> Result<()> {
        if self.initialized {
            self.cleanup()?;
        }
        
        info!("Setting video source: {} (format: {:?}, hw_accel: {:?})", 
              url, self.output_format, self.hw_accel);
        self.source_url = url.to_string();
        
        // Open input file
        let url_cstring = CString::new(url)?;
        unsafe {
            if ffmpeg_sys_next::avformat_open_input(
                &mut self.format_context,
                url_cstring.as_ptr(),
                ptr::null_mut(),
                ptr::null_mut(),
            ) != 0 {
                return Err(anyhow!("Failed to open input file"));
            }
            
            // Find stream information
            if ffmpeg_sys_next::avformat_find_stream_info(self.format_context, ptr::null_mut()) < 0 {
                return Err(anyhow!("Failed to find stream information"));
            }
            
            // Find video stream
            self.video_stream_index = -1;
            for i in 0..(*self.format_context).nb_streams {
                let stream = *(*self.format_context).streams.offset(i as isize);
                let codec_params = (*stream).codecpar;
                
                if (*codec_params).codec_type == ffmpeg_sys_next::AVMediaType::AVMEDIA_TYPE_VIDEO {
                    self.video_stream_index = i as isize;
                    break;
                }
            }
            
            if self.video_stream_index == -1 {
                return Err(anyhow!("No video stream found"));
            }
            
            // Get stream and codec parameters
            let stream = *(*self.format_context).streams.offset(self.video_stream_index);
            let codec_params = (*stream).codecpar;
            
            self.width = (*codec_params).width;
            self.height = (*codec_params).height;
            
            // Find decoder with hardware acceleration
            let codec = self.find_decoder_with_hw_accel((*codec_params).codec_id)?;
            
            // Create codec context
            self.codec_context = ffmpeg_sys_next::avcodec_alloc_context3(codec);
            if self.codec_context.is_null() {
                return Err(anyhow!("Failed to allocate codec context"));
            }
            
            // Copy codec parameters
            if ffmpeg_sys_next::avcodec_parameters_to_context(self.codec_context, codec_params) < 0 {
                return Err(anyhow!("Failed to copy codec parameters"));
            }
            
            // Set hardware acceleration
            self.setup_hardware_acceleration()?;
            
            // Open codec
            if ffmpeg_sys_next::avcodec_open2(self.codec_context, codec, ptr::null_mut()) < 0 {
                return Err(anyhow!("Failed to open codec"));
            }
            
            // Allocate frame and packet
            self.frame = ffmpeg_sys_next::av_frame_alloc();
            self.packet = ffmpeg_sys_next::av_packet_alloc();
            
            if self.frame.is_null() || self.packet.is_null() {
                return Err(anyhow!("Failed to allocate frame or packet"));
            }
            
            // Setup software scaler for format conversion
            self.setup_scaler()?;
        }
        
        self.initialized = true;
        info!("Video decoder initialized: {}x{} ({})", 
              self.width, self.height, self.output_format);
        Ok(())
    }
    
    /// Find decoder with hardware acceleration support
    fn find_decoder_with_hw_accel(&self, codec_id: ffmpeg_sys_next::AVCodecID) -> Result<*mut ffmpeg_sys_next::AVCodec> {
        unsafe {
            let codec = ffmpeg_sys_next::avcodec_find_decoder(codec_id);
            if codec.is_null() {
                return Err(anyhow!("Unsupported codec"));
            }
            
            // Try hardware accelerated decoder first
            match self.hw_accel {
                HardwareAcceleration::MediaCodec => {
                    // Try MediaCodec on Android
                    let hw_codec_name = CString::new("h264_mediacodec")?;
                    let hw_codec = ffmpeg_sys_next::avcodec_find_decoder_by_name(hw_codec_name.as_ptr());
                    if !hw_codec.is_null() {
                        info!("Using MediaCodec hardware acceleration");
                        return Ok(hw_codec);
                    }
                }
                HardwareAcceleration::VideoToolbox => {
                    // Try VideoToolbox on iOS
                    let hw_codec_name = CString::new("h264_videotoolbox")?;
                    let hw_codec = ffmpeg_sys_next::avcodec_find_decoder_by_name(hw_codec_name.as_ptr());
                    if !hw_codec.is_null() {
                        info!("Using VideoToolbox hardware acceleration");
                        return Ok(hw_codec);
                    }
                }
                _ => {}
            }
            
            // Fallback to software decoder
            info!("Using software decoder");
            Ok(codec)
        }
    }
    
    /// Setup hardware acceleration
    fn setup_hardware_acceleration(&mut self) -> Result<()> {
        unsafe {
            match self.hw_accel {
                HardwareAcceleration::MediaCodec => {
                    // MediaCodec setup for Android
                    (*self.codec_context).get_format = Some(get_format_mediacodec);
                    info!("MediaCodec hardware acceleration setup complete");
                }
                HardwareAcceleration::VideoToolbox => {
                    // VideoToolbox setup for iOS
                    (*self.codec_context).get_format = Some(get_format_videotoolbox);
                    info!("VideoToolbox hardware acceleration setup complete");
                }
                _ => {
                    debug!("No hardware acceleration requested");
                }
            }
        }
        Ok(())
    }
    
    /// Setup software scaler for format conversion
    fn setup_scaler(&mut self) -> Result<()> {
        unsafe {
            let (output_pix_fmt, output_width, output_height) = match self.output_format {
                OutputFormat::YUV420P => (
                    ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_YUV420P,
                    self.width,
                    self.height
                ),
                OutputFormat::RGB24 => (
                    ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_RGB24,
                    self.width,
                    self.height
                ),
                OutputFormat::RGBA32 => (
                    ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_RGBA,
                    self.width,
                    self.height
                ),
            };
            
            self.sws_context = ffmpeg_sys_next::sws_getContext(
                self.width,
                self.height,
                (*self.codec_context).pix_fmt,
                output_width,
                output_height,
                output_pix_fmt,
                ffmpeg_sys_next::SWS_BILINEAR,
                ptr::null_mut(),
                ptr::null_mut(),
                ptr::null_mut(),
                ptr::null_mut(),
            );
            
            if self.sws_context.is_null() {
                return Err(anyhow!("Failed to create scaler context"));
            }
        }
        
        Ok(())
    }
    
    /// Decode a chunk of video data
    pub fn decode_chunk(&mut self, chunk_data: &[u8]) -> Result<Vec<DecodedFrame>> {
        if !self.initialized {
            return Err(anyhow!("Decoder not initialized"));
        }
        
        debug!("Decoding chunk of size: {} bytes", chunk_data.len());
        
        let mut frames = Vec::new();
        
        unsafe {
            // Create a temporary packet from chunk data
            let temp_packet = ffmpeg_sys_next::av_packet_alloc();
            if temp_packet.is_null() {
                return Err(anyhow!("Failed to allocate temporary packet"));
            }
            
            // Set packet data
            (*temp_packet).data = chunk_data.as_ptr() as *mut u8;
            (*temp_packet).size = chunk_data.len() as i32;
            
            // Send packet to decoder
            let ret = ffmpeg_sys_next::avcodec_send_packet(self.codec_context, temp_packet);
            if ret < 0 {
                ffmpeg_sys_next::av_packet_free(&mut temp_packet);
                return Err(anyhow!("Failed to send packet to decoder"));
            }
            
            // Receive frames from decoder
            loop {
                let ret = ffmpeg_sys_next::avcodec_receive_frame(self.codec_context, self.frame);
                if ret == ffmpeg_sys_next::AVERROR_EAGAIN || ret == ffmpeg_sys_next::AVERROR_EOF {
                    break;
                } else if ret < 0 {
                    ffmpeg_sys_next::av_packet_free(&mut temp_packet);
                    return Err(anyhow!("Error during frame decoding"));
                }
                
                // Convert frame to desired format
                if let Ok(converted_frame) = self.convert_frame() {
                    frames.push(converted_frame);
                }
            }
            
            ffmpeg_sys_next::av_packet_free(&mut temp_packet);
        }
        
        debug!("Decoded {} frames from chunk", frames.len());
        Ok(frames)
    }
    
    /// Convert frame to desired output format
    fn convert_frame(&mut self) -> Result<DecodedFrame> {
        unsafe {
            let (output_pix_fmt, output_width, output_height) = match self.output_format {
                OutputFormat::YUV420P => (
                    ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_YUV420P,
                    self.width,
                    self.height
                ),
                OutputFormat::RGB24 => (
                    ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_RGB24,
                    self.width,
                    self.height
                ),
                OutputFormat::RGBA32 => (
                    ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_RGBA,
                    self.width,
                    self.height
                ),
            };
            
            // Allocate output frame
            let output_frame = ffmpeg_sys_next::av_frame_alloc();
            if output_frame.is_null() {
                return Err(anyhow!("Failed to allocate output frame"));
            }
            
            (*output_frame).width = output_width;
            (*output_frame).height = output_height;
            (*output_frame).format = output_pix_fmt as i32;
            
            // Allocate buffer for output frame
            let ret = ffmpeg_sys_next::av_frame_get_buffer(output_frame, 32);
            if ret < 0 {
                ffmpeg_sys_next::av_frame_free(&mut output_frame);
                return Err(anyhow!("Failed to allocate output frame buffer"));
            }
            
            // Convert frame
            let ret = ffmpeg_sys_next::sws_scale(
                self.sws_context,
                (*self.frame).data.as_ptr(),
                (*self.frame).linesize.as_ptr(),
                0,
                self.height,
                (*output_frame).data.as_mut_ptr(),
                (*output_frame).linesize.as_mut_ptr(),
            );
            
            if ret < 0 {
                ffmpeg_sys_next::av_frame_free(&mut output_frame);
                return Err(anyhow!("Failed to convert frame"));
            }
            
            // Extract frame data
            let frame_data = self.extract_frame_data(output_frame)?;
            
            let decoded_frame = DecodedFrame {
                data: frame_data,
                width: output_width as u32,
                height: output_height as u32,
                timestamp: (*self.frame).pts as u64,
                is_key_frame: (*self.frame).key_frame > 0,
                format: self.output_format,
            };
            
            ffmpeg_sys_next::av_frame_free(&mut output_frame);
            
            Ok(decoded_frame)
        }
    }
    
    /// Extract frame data from AVFrame
    fn extract_frame_data(&self, frame: *mut ffmpeg_sys_next::AVFrame) -> Result<Vec<u8>> {
        unsafe {
            let data_size = match self.output_format {
                OutputFormat::YUV420P => {
                    // YUV420P: Y plane + U plane + V plane
                    let y_size = (*frame).width * (*frame).height;
                    let uv_size = ((*frame).width * (*frame).height) / 4;
                    y_size + uv_size * 2
                }
                OutputFormat::RGB24 => {
                    // RGB24: 3 bytes per pixel
                    (*frame).width * (*frame).height * 3
                }
                OutputFormat::RGBA32 => {
                    // RGBA32: 4 bytes per pixel
                    (*frame).width * (*frame).height * 4
                }
            };
            
            let mut frame_data = vec![0u8; data_size as usize];
            
            match self.output_format {
                OutputFormat::YUV420P => {
                    // Copy Y plane
                    let y_plane = (*frame).data[0];
                    let y_linesize = (*frame).linesize[0];
                    for y in 0..self.height {
                        let src = y_plane.add((y * y_linesize) as usize);
                        let dst = frame_data.as_mut_ptr().add((y * self.width) as usize);
                        ptr::copy_nonoverlapping(src, dst, self.width as usize);
                    }
                    
                    // Copy U plane
                    let u_plane = (*frame).data[1];
                    let u_linesize = (*frame).linesize[1];
                    let uv_height = self.height / 2;
                    let uv_width = self.width / 2;
                    for y in 0..uv_height {
                        let src = u_plane.add((y * u_linesize) as usize);
                        let dst = frame_data.as_mut_ptr().add((self.width * self.height) as usize + (y * uv_width) as usize);
                        ptr::copy_nonoverlapping(src, dst, uv_width as usize);
                    }
                    
                    // Copy V plane
                    let v_plane = (*frame).data[2];
                    let v_linesize = (*frame).linesize[2];
                    for y in 0..uv_height {
                        let src = v_plane.add((y * v_linesize) as usize);
                        let dst = frame_data.as_mut_ptr().add((self.width * self.height + self.width * self.height / 4) as usize + (y * uv_width) as usize);
                        ptr::copy_nonoverlapping(src, dst, uv_width as usize);
                    }
                }
                OutputFormat::RGB24 | OutputFormat::RGBA32 => {
                    // Copy RGB/RGBA data
                    let data = (*frame).data[0];
                    let linesize = (*frame).linesize[0];
                    let bytes_per_pixel = match self.output_format {
                        OutputFormat::RGB24 => 3,
                        OutputFormat::RGBA32 => 4,
                        _ => 3,
                    };
                    
                    for y in 0..self.height {
                        let src = data.add((y * linesize) as usize);
                        let dst = frame_data.as_mut_ptr().add((y * self.width * bytes_per_pixel) as usize);
                        ptr::copy_nonoverlapping(src, dst, (self.width * bytes_per_pixel) as usize);
                    }
                }
            }
            
            Ok(frame_data)
        }
    }
    
    /// Get video info
    pub fn get_video_info(&self) -> VideoInfo {
        if !self.initialized {
            return VideoInfo::default();
        }
        
        unsafe {
            let stream = *(*self.format_context).streams.offset(self.video_stream_index);
            let codec_params = (*stream).codecpar;
            
            VideoInfo {
                width: (*codec_params).width,
                height: (*codec_params).height,
                codec_id: (*codec_params).codec_id,
                bit_rate: (*codec_params).bit_rate,
                frame_rate: (*stream).avg_frame_rate,
                duration: (*self.format_context).duration,
                output_format: self.output_format,
                hw_acceleration: self.hw_accel,
            }
        }
    }
    
    /// Cleanup resources
    fn cleanup(&mut self) -> Result<()> {
        if self.initialized {
            unsafe {
                if !self.sws_context.is_null() {
                    ffmpeg_sys_next::sws_freeContext(self.sws_context);
                    self.sws_context = ptr::null_mut();
                }
                
                if !self.frame.is_null() {
                    ffmpeg_sys_next::av_frame_free(&mut self.frame);
                    self.frame = ptr::null_mut();
                }
                
                if !self.packet.is_null() {
                    ffmpeg_sys_next::av_packet_free(&mut self.packet);
                    self.packet = ptr::null_mut();
                }
                
                if !self.codec_context.is_null() {
                    ffmpeg_sys_next::avcodec_free_context(&mut self.codec_context);
                    self.codec_context = ptr::null_mut();
                }
                
                if !self.format_context.is_null() {
                    ffmpeg_sys_next::avformat_close_input(&mut self.format_context);
                    ffmpeg_sys_next::avformat_free_context(&mut self.format_context);
                    self.format_context = ptr::null_mut();
                }
            }
            self.initialized = false;
        }
        Ok(())
    }
}

impl Drop for VideoDecoder {
    fn drop(&mut self) {
        let _ = self.cleanup();
    }
}

/// Hardware acceleration callback for MediaCodec
unsafe extern "C" fn get_format_mediacodec(
    codec_context: *mut ffmpeg_sys_next::AVCodecContext,
    formats: *const ffmpeg_sys_next::AVPixelFormat,
) -> ffmpeg_sys_next::AVPixelFormat {
    let mut i = 0;
    while !(*formats.offset(i)).eq(&ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_NONE) {
        if (*formats.offset(i)).eq(&ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_MEDIACODEC) {
            return ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_MEDIACODEC;
        }
        i += 1;
    }
    ffmpeg_sys_next::AV_PIX_FMT_YUV420P
}

/// Hardware acceleration callback for VideoToolbox
unsafe extern "C" fn get_format_videotoolbox(
    codec_context: *mut ffmpeg_sys_next::AVCodecContext,
    formats: *const ffmpeg_sys_next::AVPixelFormat,
) -> ffmpeg_sys_next::AVPixelFormat {
    let mut i = 0;
    while !(*formats.offset(i)).eq(&ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_NONE) {
        if (*formats.offset(i)).eq(&ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_VIDEOTOOLBOX) {
            return ffmpeg_sys_next::AVPixelFormat::AV_PIX_FMT_VIDEOTOOLBOX;
        }
        i += 1;
    }
    ffmpeg_sys_next::AV_PIX_FMT_YUV420P
}

/// Decoded frame structure
#[derive(Debug, Clone)]
pub struct DecodedFrame {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub timestamp: u64,
    pub is_key_frame: bool,
    pub format: OutputFormat,
}

/// Video information
#[derive(Debug, Clone, Default)]
pub struct VideoInfo {
    pub width: i32,
    pub height: i32,
    pub codec_id: ffmpeg_sys_next::AVCodecID,
    pub bit_rate: i64,
    pub frame_rate: ffmpeg_sys_next::AVRational,
    pub duration: i64,
    pub output_format: OutputFormat,
    pub hw_acceleration: HardwareAcceleration,
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_decoder_creation() {
        let decoder = VideoDecoder::new();
        assert!(decoder.is_ok());
    }
    
    #[test]
    fn test_decoder_with_config() {
        let decoder = VideoDecoder::with_config(
            OutputFormat::RGB24, 
            HardwareAcceleration::None
        );
        assert!(decoder.is_ok());
    }
}

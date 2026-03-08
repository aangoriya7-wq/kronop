/**
 * KronopCleaner.js - React Native Interface
 * High-performance video processing for mobile applications
 */

import { NativeModules, Platform } from 'react-native';

const { KronopNativeInterface } = NativeModules;

class KronopCleaner {
  constructor() {
    this.initialized = false;
    this.width = 0;
    this.height = 0;
    this.vulkanEnabled = false;
    this.performanceMode = 1; // Balanced by default
  }

  /**
   * Initialize the Kronop Cleaner AI engine
   * @param {Object} config - Configuration options
   * @param {number} config.width - Video width (e.g., 1920 for 1080p)
   * @param {number} config.height - Video height (e.g., 1080 for 1080p)
   * @param {boolean} config.enableVulkan - Enable GPU acceleration (default: true)
   * @param {number} config.performanceMode - 0=Quality, 1=Balanced, 2=Performance
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(config = {}) {
    try {
      const {
        width = 1920,
        height = 1080,
        enableVulkan = true,
        performanceMode = 1
      } = config;

      console.log(`🚀 Initializing Kronop Cleaner AI ${width}x${height}, Vulkan: ${enableVulkan}`);

      const result = await KronopNativeInterface.initialize(width, height, enableVulkan);
      
      if (result.success) {
        this.initialized = true;
        this.width = width;
        this.height = height;
        this.vulkanEnabled = result.vulkanEnabled;
        
        // Set performance mode
        await this.setPerformanceMode(performanceMode);
        
        console.log(`✅ Kronop Cleaner AI initialized successfully`);
        console.log(`   Mode: ${result.performanceMode}`);
        console.log(`   Vulkan: ${result.vulkanEnabled ? 'Enabled' : 'Disabled'}`);
        
        return {
          success: true,
          width,
          height,
          vulkanEnabled: result.vulkanEnabled,
          performanceMode: result.performanceMode,
          message: result.message
        };
      } else {
        throw new Error(result.message || 'Initialization failed');
      }
    } catch (error) {
      console.error('❌ Kronop initialization failed:', error);
      throw error;
    }
  }

  /**
   * Process a single video frame
   * @param {string|Uint8Array} frameData - Frame data (Base64 or raw bytes)
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processFrame(frameData, options = {}) {
    if (!this.initialized) {
      throw new Error('Kronop not initialized. Call initialize() first.');
    }

    try {
      const startTime = Date.now();
      
      // Convert frame data to string if needed
      let inputData;
      if (typeof frameData === 'string') {
        inputData = frameData;
      } else if (frameData instanceof Uint8Array) {
        // Convert to Base64
        inputData = btoa(String.fromCharCode.apply(null, frameData));
      } else {
        throw new Error('Invalid frame data type. Expected string or Uint8Array.');
      }

      const result = await KronopNativeInterface.processFrame(
        inputData,
        this.width,
        this.height
      );

      if (result.success) {
        const totalTime = Date.now() - startTime;
        
        console.log(`🎬 Frame processed in ${result.processingTime}ms (${result.fps} FPS)`);
        
        return {
          success: true,
          outputData: result.outputData,
          width: result.width,
          height: result.height,
          processingTime: result.processingTime,
          fps: result.fps,
          mode: result.mode,
          totalTime
        };
      } else {
        throw new Error('Frame processing failed');
      }
    } catch (error) {
      console.error('❌ Frame processing failed:', error);
      throw error;
    }
  }

  /**
   * Process multiple frames (batch processing)
   * @param {Array<string|Uint8Array>} frames - Array of frame data
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Batch processing result
   */
  async processBatch(frames, options = {}) {
    if (!this.initialized) {
      throw new Error('Kronop not initialized. Call initialize() first.');
    }

    if (!Array.isArray(frames) || frames.length === 0) {
      throw new Error('Invalid frames array. Expected non-empty array.');
    }

    try {
      const startTime = Date.now();
      const frameCount = frames.length;
      
      console.log(`🎬 Processing batch of ${frameCount} frames`);

      // Convert frames to strings
      const framesData = frames.map(frame => {
        if (typeof frame === 'string') {
          return frame;
        } else if (frame instanceof Uint8Array) {
          return btoa(String.fromCharCode.apply(null, frame));
        } else {
          throw new Error('Invalid frame data type in batch');
        }
      });

      const result = await KronopNativeInterface.processBatch(
        framesData,
        this.width,
        this.height,
        frameCount
      );

      if (result.success) {
        const totalTime = Date.now() - startTime;
        
        console.log(`✅ Batch completed in ${result.totalProcessingTime}ms`);
        console.log(`   Average: ${result.avgTimePerFrame}ms per frame (${result.avgFps} FPS)`);
        
        return {
          success: true,
          outputData: result.outputData,
          frameCount: result.frameCount,
          totalProcessingTime: result.totalProcessingTime,
          avgTimePerFrame: result.avgTimePerFrame,
          avgFps: result.avgFps,
          mode: result.mode,
          totalTime
        };
      } else {
        throw new Error('Batch processing failed');
      }
    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      throw error;
    }
  }

  /**
   * Set performance mode
   * @param {number} mode - 0=Quality, 1=Balanced, 2=Performance
   * @returns {Promise<Object>} Result
   */
  async setPerformanceMode(mode) {
    if (!this.initialized) {
      throw new Error('Kronop not initialized. Call initialize() first.');
    }

    try {
      const result = await KronopNativeInterface.setPerformanceMode(mode);
      
      if (result.success) {
        this.performanceMode = mode;
        console.log(`⚡ Performance mode set to: ${result.mode}`);
        return result;
      } else {
        throw new Error('Failed to set performance mode');
      }
    } catch (error) {
      console.error('❌ Performance mode error:', error);
      throw error;
    }
  }

  /**
   * Get engine statistics and status
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics() {
    if (!this.initialized) {
      throw new Error('Kronop not initialized. Call initialize() first.');
    }

    try {
      const result = await KronopNativeInterface.getStatistics();
      
      if (result.success) {
        return {
          success: true,
          statistics: result.statistics,
          width: result.width,
          height: result.height,
          vulkanEnabled: result.vulkanEnabled,
          mode: result.mode,
          initialized: result.initialized
        };
      } else {
        throw new Error('Failed to get statistics');
      }
    } catch (error) {
      console.error('❌ Statistics error:', error);
      throw error;
    }
  }

  /**
   * Process video stream (real-time processing)
   * @param {Function} frameProvider - Function that provides frames
   * @param {Function} frameConsumer - Function that receives processed frames
   * @param {Object} options - Stream options
   * @returns {Promise<Object>} Stream result
   */
  async processStream(frameProvider, frameConsumer, options = {}) {
    if (!this.initialized) {
      throw new Error('Kronop not initialized. Call initialize() first.');
    }

    const {
      maxFrames = 100,
      targetFPS = 30,
      onProgress = null,
      onError = null
    } = options;

    console.log(`🎥 Starting stream processing (target: ${targetFPS} FPS)`);

    return new Promise((resolve, reject) => {
      let processedFrames = 0;
      let totalProcessingTime = 0;
      let streamActive = true;

      const processNextFrame = async () => {
        if (!streamActive || processedFrames >= maxFrames) {
          const avgProcessingTime = totalProcessingTime / processedFrames;
          const avgFPS = 1000 / avgProcessingTime;
          
          console.log(`🎬 Stream completed: ${processedFrames} frames`);
          console.log(`   Average processing: ${avgProcessingTime.toFixed(2)}ms (${avgFPS.toFixed(1)} FPS)`);
          
          resolve({
            success: true,
            totalFrames: processedFrames,
            avgProcessingTime,
            avgFPS
          });
          return;
        }

        try {
          const frame = await frameProvider();
          if (!frame) {
            streamActive = false;
            return;
          }

          const result = await this.processFrame(frame);
          
          if (result.success) {
            await frameConsumer(result.outputData, result);
            
            processedFrames++;
            totalProcessingTime += result.processingTime;
            
            if (onProgress) {
              onProgress({
                frame: processedFrames,
                total: maxFrames,
                fps: result.fps,
                processingTime: result.processingTime
              });
            }
            
            // Schedule next frame to maintain target FPS
            const delay = Math.max(0, (1000 / targetFPS) - result.processingTime);
            setTimeout(processNextFrame, delay);
          } else {
            throw new Error('Frame processing failed in stream');
          }
        } catch (error) {
          console.error('❌ Stream processing error:', error);
          streamActive = false;
          
          if (onError) {
            onError(error);
          }
          
          reject(error);
        }
      };

      // Start processing
      processNextFrame();
    });
  }

  /**
   * Shutdown the engine and release resources
   * @returns {Promise<Object>} Shutdown result
   */
  async shutdown() {
    if (!this.initialized) {
      return { success: true, message: 'Already shutdown' };
    }

    try {
      console.log('🛑 Shutting down Kronop Cleaner AI...');
      
      const result = await KronopNativeInterface.shutdown();
      
      this.initialized = false;
      this.width = 0;
      this.height = 0;
      this.vulkanEnabled = false;
      
      console.log('✅ Kronop Cleaner AI shutdown complete');
      
      return result;
    } catch (error) {
      console.error('❌ Shutdown error:', error);
      throw error;
    }
  }

  /**
   * Get current status
   * @returns {Object} Current status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      width: this.width,
      height: this.height,
      vulkanEnabled: this.vulkanEnabled,
      performanceMode: this.performanceMode,
      platform: Platform.OS
    };
  }
}

// Create singleton instance
const kronopCleaner = new KronopCleaner();

// Export the instance and class
export default kronopCleaner;
export { KronopCleaner };

// Convenience exports
export const PerformanceModes = {
  QUALITY: 0,
  BALANCED: 1,
  PERFORMANCE: 2
};

export const VideoResolutions = {
  HD: { width: 1280, height: 720 },
  FHD: { width: 1920, height: 1080 },
  QHD: { width: 2560, height: 1440 },
  UHD: { width: 3840, height: 2160 }
};

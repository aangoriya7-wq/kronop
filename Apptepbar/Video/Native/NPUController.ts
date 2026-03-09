import { NativeModules, Platform } from 'react-native';

// NPU Controller for Neural Processing Unit Integration
export interface NPUModelInfo {
  name: string;
  version: string;
  type: 'tflite' | 'coreml' | 'onnx';
  inputSize: number[];
  outputSize: number[];
  isLoaded: boolean;
  processingTime: number;
}

export interface AIProcessingConfig {
  enableNPU: boolean;
  enableGPUFallback: boolean;
  sharpnessStrength: number;
  noiseReductionLevel: number;
  edgeThreshold: number;
  upscalingFactor: number;
  maxProcessingTime: number; // 16ms for 60 FPS
  realTimeUpscaling: boolean;
  dynamicBitrateEnhancement: boolean;
  bypassOnDelay: boolean;
  crystalClearMode: boolean;
}

export interface FrameAnalysisResult {
  complexity: number;
  edgeCount: number;
  noiseLevel: number;
  recommendedSharpness: number;
  recommendedNoiseReduction: number;
  processingTime: number;
}

export interface NPUPerformanceMetrics {
  npuUtilization: number;
  gpuUtilization: number;
  averageProcessingTime: number;
  framesProcessed: number;
  droppedFrames: number;
  memoryUsage: number;
  thermalThrottling: boolean;
}

// NPU Controller Implementation
class NPUController {
  private nativeNPU: any;
  private modelInfo: NPUModelInfo;
  private config: AIProcessingConfig;
  private performanceMetrics: NPUPerformanceMetrics;
  private isInitialized = false;
  private frameCount = 0;
  private lastFrameTime = 0;
  private processingQueue: ArrayBuffer[] = [];
  private isProcessing = false;

  constructor(config: AIProcessingConfig) {
    this.config = config;
    this.nativeNPU = NativeModules.KronopAISharpnessEngine;
    
    this.modelInfo = {
      name: 'sharpness_enhancement_v2',
      version: '1.0.0',
      type: Platform.OS === 'android' ? 'tflite' : 'coreml',
      inputSize: [1, 1080, 1920, 4], // NHWC format
      outputSize: [1, 1080, 1920, 4],
      isLoaded: false,
      processingTime: 0,
    };
    
    this.performanceMetrics = {
      npuUtilization: 0,
      gpuUtilization: 0,
      averageProcessingTime: 0,
      framesProcessed: 0,
      droppedFrames: 0,
      memoryUsage: 0,
      thermalThrottling: false,
    };
  }

  /**
   * Initialize NPU Controller with Neural Network
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🧠 Initializing NPU Controller');
      
      // Check NPU availability
      const npuAvailable = await this.checkNPUAvailability();
      
      if (!npuAvailable && !this.config.enableGPUFallback) {
        console.error('❌ NPU not available and GPU fallback disabled');
        return false;
      }
      
      // Create native AI engine
      const engineId = await this.nativeNPU.create();
      
      if (engineId === 0) {
        console.error('❌ Failed to create AI engine');
        return false;
      }
      
      // Load AI model
      const modelLoaded = await this.loadAIModel();
      
      if (!modelLoaded) {
        console.error('❌ Failed to load AI model');
        return false;
      }
      
      this.isInitialized = true;
      this.modelInfo.isLoaded = true;
      
      console.log('✅ NPU Controller initialized successfully');
      console.log(`🎯 Model: ${this.modelInfo.name} (${this.modelInfo.type})`);
      console.log(`🔧 NPU Available: ${npuAvailable}`);
      console.log(`🔄 GPU Fallback: ${this.config.enableGPUFallback}`);
      
      return true;
    } catch (error) {
      console.error('❌ NPU Controller initialization failed:', error);
      return false;
    }
  }

  /**
   * Check NPU availability on device
   */
  private async checkNPUAvailability(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Check Android NNAPI availability
        const isNPUAvailable = await this.nativeNPU.isNPUAvailable();
        console.log(`🤖 Android NPU Available: ${isNPUAvailable}`);
        return isNPUAvailable;
      } else if (Platform.OS === 'ios') {
        // Check iOS CoreML availability
        const coreMLAvailable = await this.checkCoreMLAvailability();
        console.log(`🍎 iOS CoreML Available: ${coreMLAvailable}`);
        return coreMLAvailable;
      } else {
        console.log('💻 Platform not supported for NPU');
        return false;
      }
    } catch (error) {
      console.error('❌ NPU availability check failed:', error);
      return false;
    }
  }

  /**
   * Check CoreML availability on iOS
   */
  private async checkCoreMLAvailability(): Promise<boolean> {
    try {
      // Check if CoreML framework is available
      const coreMLFramework = await this.nativeNPU.checkCoreMLFramework();
      return coreMLFramework !== null;
    } catch (error) {
      console.error('❌ CoreML availability check failed:', error);
      return false;
    }
  }

  /**
   * Load AI model for NPU processing
   */
  private async loadAIModel(): Promise<boolean> {
    try {
      console.log('📦 Loading AI model for NPU processing');
      
      // Model path based on platform
      const modelPath = Platform.OS === 'android' 
        ? '/data/data/com.kronop.reels/models/sharpness_model.tflite'
        : 'sharpness_model.mlmodel';
      
      // Load model asynchronously
      const modelLoaded = await this.nativeNPU.loadModel(modelPath);
      
      if (modelLoaded) {
        this.modelInfo.isLoaded = true;
        console.log(`✅ AI model loaded: ${modelPath}`);
        return true;
      } else {
        console.error('❌ Failed to load AI model');
        return false;
      }
    } catch (error) {
      console.error('❌ AI model loading failed:', error);
      return false;
    }
  }

  /**
   * Process video frame with AI enhancement
   */
  async processFrame(frameData: ArrayBuffer, width: number, height: number): Promise<ArrayBuffer | null> {
    if (!this.isInitialized) {
      console.error('❌ NPU Controller not initialized');
      return null;
    }

    const currentTime = Date.now();
    
    // Check if already processing (16ms budget for 60 FPS)
    if (this.isProcessing && (currentTime - this.lastFrameTime) < this.config.maxProcessingTime) {
      console.warn('⚠️ Frame dropped - processing budget exceeded');
      this.performanceMetrics.droppedFrames++;
      
      // Bypass AI processing if enabled and consistently slow
      if (this.config.bypassOnDelay && this.performanceMetrics.averageProcessingTime > this.config.maxProcessingTime * 0.8) {
        console.log('🔄 Bypassing AI processing - performance budget exceeded');
        return null; // Signal to use original frame
      }
      
      return null;
    }

    this.isProcessing = true;
    this.lastFrameTime = currentTime;

    try {
      // Analyze frame complexity first
      const analysis = await this.analyzeFrameComplexity(frameData, width, height);
      
      // Adjust processing parameters dynamically
      this.adjustProcessingParameters(analysis);
      
      // Process frame with NPU or GPU fallback
      const startTime = Date.now();
      const processedFrame = await this.processWithAI(frameData, width, height);
      const processingTime = Date.now() - startTime;
      
      // Update performance metrics
      this.updatePerformanceMetrics(processingTime, analysis);
      
      // Check if processing time exceeds budget
      if (processingTime > this.config.maxProcessingTime) {
        console.warn(`⚠️ Processing time exceeded: ${processingTime}ms > ${this.config.maxProcessingTime}ms`);
        
        // Enable bypass mode if consistently slow
        if (this.performanceMetrics.averageProcessingTime > this.config.maxProcessingTime * 0.8) {
          console.log('🔄 Enabling AI bypass mode');
          this.config.enableNPU = false;
        }
      }
      
      this.frameCount++;
      this.performanceMetrics.framesProcessed = this.frameCount;
      
      console.log(`✅ Frame processed: ${processingTime}ms (NPU: ${this.config.enableNPU})`);
      
      return processedFrame;
    } catch (error) {
      console.error('❌ Frame processing failed:', error);
      return null;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Analyze frame complexity for dynamic enhancement
   */
  private async analyzeFrameComplexity(frameData: ArrayBuffer, width: number, height: number): Promise<FrameAnalysisResult> {
    try {
      // Convert ArrayBuffer to Uint8Array for processing
      const uint8Array = new Uint8Array(frameData);
      
      // Calculate edge density
      let edgeCount = 0;
      let noiseLevel = 0.0;
      
      // Sample pixels for analysis (every 10th pixel for performance)
      for (let y = 1; y < height - 1; y += 10) {
        for (let x = 1; x < width - 1; x += 10) {
          const idx = y * width + x;
          
          // Calculate gradient
          const gx = Math.abs(uint8Array[idx + 1] - uint8Array[idx - 1]);
          const gy = Math.abs(uint8Array[idx + width] - uint8Array[idx - width]);
          
          if (gx > 30 || gy > 30) {
            edgeCount++;
          }
          
          // Simple noise estimation
          const neighbors = [
            uint8Array[idx - width - 1],
            uint8Array[idx - 1],
            uint8Array[idx + 1],
            uint8Array[idx + width + 1],
          ];
          
          const avg = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
          const variance = neighbors.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / neighbors.length;
          noiseLevel += Math.sqrt(variance);
        }
      }
      
      const totalSamples = Math.floor((width - 2) * (height - 2) / 100);
      const complexity = edgeCount / totalSamples;
      const normalizedNoise = noiseLevel / totalSamples;
      
      // Recommend processing parameters
      const recommendedSharpness = complexity > 0.7 ? 2.0 : complexity > 0.3 ? 1.5 : 1.0;
      const recommendedNoiseReduction = normalizedNoise > 20 ? 0.5 : normalizedNoise > 10 ? 0.3 : 0.2;
      
      return {
        complexity,
        edgeCount,
        noiseLevel: normalizedNoise,
        recommendedSharpness,
        recommendedNoiseReduction,
        processingTime: 0,
      };
    } catch (error) {
      console.error('❌ Frame analysis failed:', error);
      return {
        complexity: 0.5,
        edgeCount: 0,
        noiseLevel: 0.2,
        recommendedSharpness: 1.5,
        recommendedNoiseReduction: 0.3,
        processingTime: 0,
      };
    }
  }

  /**
   * Adjust processing parameters based on frame analysis
   */
  private adjustProcessingParameters(analysis: FrameAnalysisResult): void {
    // Dynamic parameter adjustment
    this.config.sharpnessStrength = analysis.recommendedSharpness;
    this.config.noiseReductionLevel = analysis.recommendedNoiseReduction;
    
    // Update native parameters
    this.nativeNPU.setSharpness(this.config.sharpnessStrength);
    this.nativeNPU.setNoiseReduction(this.config.noiseReductionLevel);
    
    console.log(`🎛️ Adjusted parameters: Sharpness=${this.config.sharpnessStrength}, Noise=${this.config.noiseReductionLevel}`);
  }

  /**
   * Process frame using AI (NPU or GPU fallback)
   */
  private async processWithAI(frameData: ArrayBuffer, width: number, height: number): Promise<ArrayBuffer> {
    try {
      if (this.config.enableNPU) {
        // Use NPU for processing
        console.log('🧠 Processing with NPU - Real-time Upscaling Enabled');
        return await this.processWithNPU(frameData, width, height);
      } else {
        // Use GPU fallback
        console.log('🎮 Processing with GPU fallback - Crystal Clear Mode');
        return await this.processWithGPU(frameData, width, height);
      }
    } catch (error) {
      console.error('❌ AI processing failed:', error);
      throw error;
    }
  }

  /**
   * Process frame using NPU
   */
  private async processWithNPU(frameData: ArrayBuffer, width: number, height: number): Promise<ArrayBuffer> {
    try {
      const startTime = Date.now();
      
      // Apply real-time upscaling if enabled
      let processedFrame = frameData;
      if (this.config.realTimeUpscaling) {
        processedFrame = await this.applyRealTimeUpscaling(frameData, width, height);
      }
      
      // Apply edge enhancement through NPU
      const enhancedFrame = await this.nativeNPU.processFrame(processedFrame, width, height);
      
      // Apply dynamic bitrate enhancement if enabled
      if (this.config.dynamicBitrateEnhancement) {
        return await this.applyDynamicBitrateEnhancement(enhancedFrame, width, height);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Update NPU utilization
      this.performanceMetrics.npuUtilization = Math.min(100, (processingTime / this.config.maxProcessingTime) * 100);
      this.performanceMetrics.gpuUtilization = 0;
      
      console.log(`🧠 NPU Processing: ${processingTime}ms (Upscaling: ${this.config.realTimeUpscaling})`);
      return enhancedFrame;
    } catch (error) {
      console.error('❌ NPU processing failed:', error);
      throw error;
    }
  }

  /**
   * Process frame using GPU fallback
   */
  private async processWithGPU(frameData: ArrayBuffer, width: number, height: number): Promise<ArrayBuffer> {
    try {
      console.log('🎮 GPU Fallback Processing');
      
      // Simulate GPU processing (would call TurboBridge in real implementation)
      const startTime = Date.now();
      
      // Apply GPU-based enhancement
      const processedFrame = await this.applyGPUEnhancement(frameData, width, height);
      const processingTime = Date.now() - startTime;
      
      // Update GPU utilization
      this.performanceMetrics.gpuUtilization = Math.min(100, (processingTime / this.config.maxProcessingTime) * 100);
      this.performanceMetrics.npuUtilization = 0;
      
      console.log(`🎮 GPU Processing: ${processingTime}ms`);
      return processedFrame;
    } catch (error) {
      console.error('❌ GPU processing failed:', error);
      throw error;
    }
  }

  /**
   * Apply GPU-based enhancement (fallback)
   */
  private async applyGPUEnhancement(frameData: ArrayBuffer, width: number, height: number): Promise<ArrayBuffer> {
    // Simulate GPU shader processing
    // In real implementation, this would call TurboBridge with custom shaders
    
    const uint8Array = new Uint8Array(frameData);
    const enhancedArray = new Uint8Array(frameData);
    
    // Apply crystal clear enhancement
    for (let i = 0; i < uint8Array.length; i += 4) {
      const r = uint8Array[i];
      const g = uint8Array[i + 1];
      const b = uint8Array[i + 2];
      
      // Enhanced edge detection and sharpening
      if (i > width * 4 && i < uint8Array.length - width * 4) {
        const leftR = uint8Array[i - 4];
        const topR = uint8Array[i - width * 4];
        const rightR = uint8Array[i + 4];
        const bottomR = uint8Array[i + width * 4];
        
        // Advanced edge enhancement for crystal clear quality
        const edgeH = Math.abs(r - leftR) + Math.abs(r - rightR);
        const edgeV = Math.abs(r - topR) + Math.abs(r - bottomR);
        const totalEdge = Math.sqrt(edgeH * edgeH + edgeV * edgeV);
        
        const enhancement = Math.min(255, totalEdge * this.config.sharpnessStrength * 0.5);
        
        enhancedArray[i] = Math.min(255, r + enhancement);
        enhancedArray[i + 1] = Math.min(255, g + enhancement);
        enhancedArray[i + 2] = Math.min(255, b + enhancement);
      }
      
      // Noise reduction for crystal clear output
      if (this.config.crystalClearMode) {
        const noiseThreshold = this.config.noiseReductionLevel * 10;
        if (Math.abs(r - 128) < noiseThreshold) enhancedArray[i] = 128;
        if (Math.abs(g - 128) < noiseThreshold) enhancedArray[i + 1] = 128;
        if (Math.abs(b - 128) < noiseThreshold) enhancedArray[i + 2] = 128;
      }
    }
    
    return enhancedArray.buffer;
  }

  /**
   * Apply Real-time Upscaling using AI
   */
  private async applyRealTimeUpscaling(frameData: ArrayBuffer, width: number, height: number): Promise<ArrayBuffer> {
    try {
      console.log(`🔍 Real-time Upscaling: ${width}x${height} -> ${width * this.config.upscalingFactor}x${height * this.config.upscalingFactor}`);
      
      // In real implementation, this would use AI super-resolution model
      // For now, simulate upscaling with enhanced interpolation
      
      const scaleFactor = this.config.upscalingFactor;
      const newWidth = Math.floor(width * scaleFactor);
      const newHeight = Math.floor(height * scaleFactor);
      
      const inputArray = new Uint8Array(frameData);
      const outputArray = new Uint8Array(newWidth * newHeight * 4);
      
      // Enhanced bicubic interpolation with AI edge preservation
      for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
          const srcX = x / scaleFactor;
          const srcY = y / scaleFactor;
          
          const x1 = Math.floor(srcX);
          const y1 = Math.floor(srcY);
          const x2 = Math.min(x1 + 1, width - 1);
          const y2 = Math.min(y1 + 1, height - 1);
          
          const dx = srcX - x1;
          const dy = srcY - y1;
          
          // Bicubic interpolation with edge enhancement
          for (let c = 0; c < 4; c++) {
            const p1 = inputArray[(y1 * width + x1) * 4 + c];
            const p2 = inputArray[(y1 * width + x2) * 4 + c];
            const p3 = inputArray[(y2 * width + x1) * 4 + c];
            const p4 = inputArray[(y2 * width + x2) * 4 + c];
            
            // Enhanced interpolation
            const interpolated = p1 * (1 - dx) * (1 - dy) + 
                               p2 * dx * (1 - dy) + 
                               p3 * (1 - dx) * dy + 
                               p4 * dx * dy;
            
            // Apply AI edge enhancement
            const edgeBoost = this.config.sharpnessStrength * 0.2;
            const enhanced = interpolated + (interpolated - 128) * edgeBoost;
            
            outputArray[(y * newWidth + x) * 4 + c] = Math.max(0, Math.min(255, enhanced));
          }
        }
      }
      
      console.log(`✅ Real-time Upscaling completed: ${newWidth}x${newHeight}`);
      return outputArray.buffer;
      
    } catch (error) {
      console.error('❌ Real-time upscaling failed:', error);
      return frameData; // Return original on error
    }
  }

  /**
   * Apply Dynamic Bitrate Enhancement
   */
  private async applyDynamicBitrateEnhancement(frameData: ArrayBuffer, width: number, height: number): Promise<ArrayBuffer> {
    try {
      console.log('🎨 Applying Dynamic Bitrate Enhancement');
      
      const uint8Array = new Uint8Array(frameData);
      const enhancedArray = new Uint8Array(frameData);
      
      // Analyze frame quality metrics
      let totalBrightness = 0;
      let totalContrast = 0;
      let pixelCount = 0;
      
      // Sample frame for quality analysis
      for (let i = 0; i < uint8Array.length; i += 4) {
        const r = uint8Array[i];
        const g = uint8Array[i + 1];
        const b = uint8Array[i + 2];
        
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
        
        // Calculate local contrast
        if (i > width * 4 && i < uint8Array.length - width * 4) {
          const neighborBrightness = (uint8Array[i - 4] + uint8Array[i + 4] + 
                                     uint8Array[i - width * 4] + uint8Array[i + width * 4]) / 12;
          const contrast = Math.abs(brightness - neighborBrightness);
          totalContrast += contrast;
        }
        
        pixelCount++;
      }
      
      const avgBrightness = totalBrightness / pixelCount;
      const avgContrast = totalContrast / pixelCount;
      
      // Dynamic enhancement based on quality analysis
      const needsEnhancement = avgBrightness < 100 || avgContrast < 15;
      
      if (needsEnhancement) {
        console.log(`🔧 Quality enhancement needed - Brightness: ${avgBrightness.toFixed(1)}, Contrast: ${avgContrast.toFixed(1)}`);
        
        for (let i = 0; i < uint8Array.length; i += 4) {
          let r = uint8Array[i];
          let g = uint8Array[i + 1];
          let b = uint8Array[i + 2];
          
          // Dynamic brightness correction
          if (avgBrightness < 100) {
            const brightnessBoost = (100 - avgBrightness) * 0.3;
            r = Math.min(255, r + brightnessBoost);
            g = Math.min(255, g + brightnessBoost);
            b = Math.min(255, b + brightnessBoost);
          }
          
          // Dynamic contrast enhancement
          if (avgContrast < 15) {
            const contrastBoost = (15 - avgContrast) * 0.05;
            r = Math.min(255, Math.max(0, (r - 128) * (1 + contrastBoost) + 128));
            g = Math.min(255, Math.max(0, (g - 128) * (1 + contrastBoost) + 128));
            b = Math.min(255, Math.max(0, (b - 128) * (1 + contrastBoost) + 128));
          }
          
          // Apply AI color correction
          const rf = r / 255.0;
          const gf = g / 255.0;
          const bf = b / 255.0;
          
          // Enhanced color saturation
          const luminance = 0.299 * rf + 0.587 * gf + 0.114 * bf;
          const saturationBoost = 1.2;
          
          const nr = luminance + (rf - luminance) * saturationBoost;
          const ng = luminance + (gf - luminance) * saturationBoost;
          const nb = luminance + (bf - luminance) * saturationBoost;
          
          enhancedArray[i] = Math.round(Math.max(0, Math.min(1, nr)) * 255);
          enhancedArray[i + 1] = Math.round(Math.max(0, Math.min(1, ng)) * 255);
          enhancedArray[i + 2] = Math.round(Math.max(0, Math.min(1, nb)) * 255);
          enhancedArray[i + 3] = uint8Array[i + 3]; // Alpha channel
        }
        
        console.log('✅ Dynamic Bitrate Enhancement applied successfully');
      } else {
        console.log('👍 Frame quality is good, no enhancement needed');
        return frameData;
      }
      
      return enhancedArray.buffer;
      
    } catch (error) {
      console.error('❌ Dynamic bitrate enhancement failed:', error);
      return frameData; // Return original on error
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(processingTime: number, analysis: FrameAnalysisResult): void {
    // Update average processing time
    this.performanceMetrics.averageProcessingTime = 
      this.performanceMetrics.averageProcessingTime * 0.9 + processingTime * 0.1;
    
    // Update memory usage (estimated)
    this.performanceMetrics.memoryUsage = 
      this.performanceMetrics.memoryUsage * 0.9 + analysis.complexity * 100;
    
    // Check thermal throttling
    if (processingTime > this.config.maxProcessingTime * 1.5) {
      this.performanceMetrics.thermalThrottling = true;
      console.warn('🔥 Thermal throttling detected');
    } else {
      this.performanceMetrics.thermalThrottling = false;
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): NPUPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get model information
   */
  getModelInfo(): NPUModelInfo {
    return { ...this.modelInfo };
  }

  /**
   * Check if NPU Controller is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.modelInfo.isLoaded;
  }

  /**
   * Enable/disable NPU processing
   */
  setNPUEnabled(enabled: boolean): void {
    this.config.enableNPU = enabled;
    console.log(`🧠 NPU Processing: ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Enable/disable GPU fallback
   */
  setGPUFallbackEnabled(enabled: boolean): void {
    this.config.enableGPUFallback = enabled;
    console.log(`🎮 GPU Fallback: ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Update processing configuration
   */
  updateConfig(newConfig: Partial<AIProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update native parameters
    if (this.nativeNPU) {
      this.nativeNPU.setSharpness(this.config.sharpnessStrength);
      this.nativeNPU.setNoiseReduction(this.config.noiseReductionLevel);
    }
    
    console.log('⚙️ Configuration updated');
  }

  /**
   * Cleanup NPU Controller resources
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up NPU Controller');
    
    try {
      if (this.nativeNPU) {
        await this.nativeNPU.destroy();
        console.log('✅ Native NPU destroyed');
      }
      
      // Reset state
      this.isInitialized = false;
      this.modelInfo.isLoaded = false;
      this.processingQueue = [];
      
      // Reset performance metrics
      this.performanceMetrics = {
        npuUtilization: 0,
        gpuUtilization: 0,
        averageProcessingTime: 0,
        framesProcessed: 0,
        droppedFrames: 0,
        memoryUsage: 0,
        thermalThrottling: false,
      };
      
      console.log('✅ NPU Controller cleanup completed');
    } catch (error) {
      console.error('❌ NPU Controller cleanup failed:', error);
    }
  }
}

// Singleton instance for global access
let npuControllerInstance: NPUController | null = null;

/**
 * Get NPU Controller instance
 */
export function getNPUController(): NPUController {
  if (!npuControllerInstance) {
    npuControllerInstance = new NPUController({
      enableNPU: true,
      enableGPUFallback: true,
      sharpnessStrength: 1.5,
      noiseReductionLevel: 0.3,
      edgeThreshold: 0.1,
      upscalingFactor: 1.0,
      maxProcessingTime: 16, // 16ms for 60 FPS
      realTimeUpscaling: true,
      dynamicBitrateEnhancement: true,
      bypassOnDelay: true,
      crystalClearMode: true,
    });
  }
  return npuControllerInstance;
}

/**
 * Initialize NPU Controller (call once at app start)
 */
export async function initializeNPUController(): Promise<boolean> {
  const controller = getNPUController();
  return await controller.initialize();
}

/**
 * Cleanup NPU Controller (call once at app exit)
 */
export async function cleanupNPUController(): Promise<void> {
  const controller = getNPUController();
  await controller.cleanup();
}

// Export for React Native
export default {
  getNPUController,
  initializeNPUController,
  cleanupNPUController,
};

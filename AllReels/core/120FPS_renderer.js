// 120FPS High-Performance Rendering Pipeline
class FPS120Renderer {
  constructor() {
    this.targetFPS = 120;
    this.frameTime = 1000 / 120; // 8.33ms per frame
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.isRunning = false;
    this.renderCallbacks = [];
    this.performanceMetrics = {
      averageFPS: 0,
      frameDropRate: 0,
      renderTime: 0,
      memoryUsage: 0
    };
  }

  // Add render callback to pipeline
  addRenderCallback(callback) {
    this.renderCallbacks.push(callback);
  }

  // Remove render callback from pipeline
  removeRenderCallback(callback) {
    const index = this.renderCallbacks.indexOf(callback);
    if (index > -1) {
      this.renderCallbacks.splice(index, 1);
    }
  }

  // Start 120FPS rendering loop
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.droppedFrames = 0;
    
    console.log('🚀 Starting 120FPS rendering pipeline...');
    this.renderLoop();
  }

  // Stop rendering loop
  stop() {
    this.isRunning = false;
    console.log('⏹️ 120FPS rendering pipeline stopped');
  }

  // Main rendering loop
  renderLoop = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    // Check if it's time for next frame (8.33ms for 120FPS)
    if (deltaTime >= this.frameTime) {
      const frameStartTime = performance.now();

      // Execute all render callbacks
      this.renderCallbacks.forEach(callback => {
        try {
          callback(currentTime, deltaTime);
        } catch (error) {
          console.error('❌ Render callback error:', error);
        }
      });

      const frameEndTime = performance.now();
      const renderTime = frameEndTime - frameStartTime;

      // Update metrics
      this.frameCount++;
      this.performanceMetrics.renderTime = renderTime;

      // Check for dropped frames
      if (deltaTime > this.frameTime * 2) {
        this.droppedFrames++;
      }

      // Update performance metrics every 60 frames
      if (this.frameCount % 60 === 0) {
        this.updatePerformanceMetrics(currentTime);
      }

      this.lastFrameTime = currentTime;
    }

    // Schedule next frame
    requestAnimationFrame(this.renderLoop);
  };

  // Update performance metrics
  updatePerformanceMetrics(currentTime) {
    const totalTime = currentTime - this.startTime;
    const averageFPS = this.frameCount / (totalTime / 1000);
    const frameDropRate = (this.droppedFrames / this.frameCount) * 100;

    this.performanceMetrics.averageFPS = averageFPS;
    this.performanceMetrics.frameDropRate = frameDropRate;

    // Memory usage estimation
    if (performance.memory) {
      this.performanceMetrics.memoryUsage = 
        (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
    }

    // Log metrics
    console.log('📊 120FPS Metrics:', {
      fps: averageFPS.toFixed(1),
      dropRate: frameDropRate.toFixed(2) + '%',
      renderTime: this.performanceMetrics.renderTime.toFixed(2) + 'ms',
      memory: this.performanceMetrics.memoryUsage + 'MB'
    });

    // Performance alerts
    this.checkPerformanceAlerts();
  }

  // Check for performance issues
  checkPerformanceAlerts() {
    const { averageFPS, frameDropRate, renderTime } = this.performanceMetrics;

    if (averageFPS < 100) {
      console.warn('⚠️ LOW FPS DETECTED:', averageFPS.toFixed(1));
    }

    if (frameDropRate > 5) {
      console.warn('⚠️ HIGH FRAME DROP RATE:', frameDropRate.toFixed(1) + '%');
    }

    if (renderTime > 6) { // More than 6ms render time
      console.warn('⚠️ HIGH RENDER TIME:', renderTime.toFixed(2) + 'ms');
    }
  }

  // Get current performance metrics
  getMetrics() {
    return { ...this.performanceMetrics };
  }

  // Reset metrics
  resetMetrics() {
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.startTime = performance.now();
    this.performanceMetrics = {
      averageFPS: 0,
      frameDropRate: 0,
      renderTime: 0,
      memoryUsage: 0
    };
  }

  // Adaptive quality adjustment based on performance
  adjustQuality() {
    const { averageFPS, frameDropRate } = this.performanceMetrics;

    if (averageFPS < 90 || frameDropRate > 10) {
      console.log('🔧 Reducing quality to maintain 120FPS');
      return {
        resolution: '720p',
        bitrate: 'low',
        effects: 'minimal'
      };
    } else if (averageFPS > 110 && frameDropRate < 2) {
      console.log('🎯 Increasing quality - performance is excellent');
      return {
        resolution: '4K',
        bitrate: 'high',
        effects: 'maximum'
      };
    }

    return {
      resolution: '1080p',
      bitrate: 'medium',
      effects: 'standard'
    };
  }

  // Frame scheduling for precise timing
  scheduleFrame(callback, delay = 0) {
    if (delay > 0) {
      setTimeout(() => {
        if (this.isRunning) {
          callback();
        }
      }, delay);
    } else {
      // Immediate execution for zero-delay frames
      if (this.isRunning) {
        callback();
      }
    }
  }

  // Batch processing for multiple frames
  batchProcess(frames, processor) {
    const batchSize = Math.min(frames.length, 10); // Max 10 frames per batch
    const batches = [];

    for (let i = 0; i < frames.length; i += batchSize) {
      batches.push(frames.slice(i, i + batchSize));
    }

    return batches.map((batch, index) => {
      return new Promise((resolve) => {
        this.scheduleFrame(() => {
          const results = batch.map(processor);
          resolve(results);
        }, index * this.frameTime);
      });
    });
  }

  // Cleanup resources
  destroy() {
    this.stop();
    this.renderCallbacks = [];
    this.resetMetrics();
    console.log('🧹 120FPS renderer destroyed');
  }
}

// Singleton instance
const fps120Renderer = new FPS120Renderer();

export default fps120Renderer;
export { FPS120Renderer };

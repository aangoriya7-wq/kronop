import { Platform } from 'react-native';

// Ultra-High Performance Monitoring System
export class PerformanceMonitor {
  private startTime: number = 0;
  private frameCount: number = 0;
  private droppedFrames: number = 0;
  private memoryUsage: number[] = [];
  private renderTimes: number[] = [];
  private isMonitoring: boolean = false;

  constructor() {
    this.reset();
  }

  startMonitoring(): void {
    this.isMonitoring = true;
    this.startTime = Date.now();
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.memoryUsage = [];
    this.renderTimes = [];
    
    console.log('🚀 Performance Monitor Started');
    
    // Start high-frequency monitoring
    if (Platform.OS === 'web') {
      this.startWebMonitoring();
    } else {
      this.startNativeMonitoring();
    }
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('⏹️ Performance Monitor Stopped');
  }

  private startWebMonitoring(): void {
    if (!this.isMonitoring) return;

    const monitorFrame = () => {
      if (!this.isMonitoring) return;

      const frameStart = performance.now();
      
      requestAnimationFrame(() => {
        const frameEnd = performance.now();
        const frameTime = frameEnd - frameStart;
        
        this.recordFrameMetrics(frameTime);
        
        if (this.isMonitoring) {
          monitorFrame();
        }
      });
    };

    monitorFrame();
  }

  private startNativeMonitoring(): void {
    if (!this.isMonitoring) return;

    const monitorInterval = setInterval(() => {
      if (!this.isMonitoring) {
        clearInterval(monitorInterval);
        return;
      }

      // Simulate frame timing for native
      const frameTime = 16.67; // 60 FPS target
      this.recordFrameMetrics(frameTime);
    }, 16); // Monitor every frame
  }

  private recordFrameMetrics(frameTime: number): void {
    this.frameCount++;
    this.renderTimes.push(frameTime);

    // Detect dropped frames (below 30 FPS)
    if (frameTime > 33.33) {
      this.droppedFrames++;
    }

    // Record memory usage every 60 frames
    if (this.frameCount % 60 === 0) {
      this.recordMemoryUsage();
    }
  }

  private recordMemoryUsage(): void {
    if (Platform.OS === 'web' && 'memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      this.memoryUsage.push(usedMB);
    } else {
      // Simulate memory usage for native
      const simulatedUsage = 50 + Math.random() * 100;
      this.memoryUsage.push(simulatedUsage);
    }
  }

  getMetrics(): PerformanceMetrics {
    const duration = Date.now() - this.startTime;
    const avgFPS = this.calculateAverageFPS();
    const avgFrameTime = this.calculateAverageFrameTime();
    const avgMemoryUsage = this.calculateAverageMemoryUsage();
    const stability = this.calculateStability();

    return {
      duration,
      totalFrames: this.frameCount,
      averageFPS: avgFPS,
      averageFrameTime: avgFrameTime,
      droppedFrames: this.droppedFrames,
      frameDropRate: (this.droppedFrames / this.frameCount) * 100,
      averageMemoryUsage: avgMemoryUsage,
      peakMemoryUsage: Math.max(...this.memoryUsage, 0),
      stability: stability,
      quality: this.assessQuality(avgFPS, stability),
    };
  }

  private calculateAverageFPS(): number {
    if (this.renderTimes.length === 0) return 0;
    const avgFrameTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
    return 1000 / avgFrameTime;
  }

  private calculateAverageFrameTime(): number {
    if (this.renderTimes.length === 0) return 0;
    return this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
  }

  private calculateAverageMemoryUsage(): number {
    if (this.memoryUsage.length === 0) return 0;
    return this.memoryUsage.reduce((a, b) => a + b, 0) / this.memoryUsage.length;
  }

  private calculateStability(): number {
    if (this.renderTimes.length < 10) return 100;
    
    const recentFrames = this.renderTimes.slice(-60); // Last 60 frames
    const variance = this.calculateVariance(recentFrames);
    const maxVariance = 100; // Maximum acceptable variance
    return Math.max(0, 100 - (variance / maxVariance) * 100);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  private assessQuality(fps: number, stability: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    if (fps >= 58 && stability >= 95) return 'Excellent';
    if (fps >= 50 && stability >= 85) return 'Good';
    if (fps >= 30 && stability >= 70) return 'Fair';
    return 'Poor';
  }

  reset(): void {
    this.startTime = 0;
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.memoryUsage = [];
    this.renderTimes = [];
    this.isMonitoring = false;
  }

  // Real-time performance alerts
  checkPerformanceAlerts(): void {
    const metrics = this.getMetrics();
    
    if (metrics.averageFPS < 30) {
      console.warn('⚠️ LOW FPS DETECTED:', metrics.averageFPS.toFixed(1));
    }
    
    if (metrics.frameDropRate > 5) {
      console.warn('⚠️ HIGH FRAME DROP RATE:', metrics.frameDropRate.toFixed(1) + '%');
    }
    
    if (metrics.averageMemoryUsage > 200) {
      console.warn('⚠️ HIGH MEMORY USAGE:', metrics.averageMemoryUsage.toFixed(1) + 'MB');
    }
    
    if (metrics.stability < 80) {
      console.warn('⚠️ LOW STABILITY:', metrics.stability.toFixed(1) + '%');
    }
  }
}

export interface PerformanceMetrics {
  duration: number;
  totalFrames: number;
  averageFPS: number;
  averageFrameTime: number;
  droppedFrames: number;
  frameDropRate: number;
  averageMemoryUsage: number;
  peakMemoryUsage: number;
  stability: number;
  quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

// Legacy React component for backward compatibility
const LegacyPerformanceMonitor = () => {
  return null;
};

export default LegacyPerformanceMonitor;

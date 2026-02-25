// Mobile Video Fix for Blank Screen Issue
import { logger } from '../utils/ZeroGC';

class MobileVideoFix {
  constructor() {
    this.canvas = null;
    this.context = null;
    this.animationId = null;
    this.frameCount = 0;
    this.isRendering = false;
  }

  // Initialize canvas for mobile video rendering
  initializeCanvas() {
    try {
      // Create canvas element for video rendering
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1920;
      this.canvas.height = 1080;
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.height = '100%';
      this.canvas.style.zIndex = '9999';
      this.canvas.style.backgroundColor = '#000';
      
      // Add canvas to DOM
      document.body.appendChild(this.canvas);
      
      // Get 2D context
      this.context = this.canvas.getContext('2d');
      
      if (this.context) {
        console.log('📱 Mobile canvas initialized for video rendering');
        logger.log('Mobile canvas created', this.canvas);
        return true;
      }
    } catch (error) {
      console.error('❌ Canvas initialization failed:', error);
      return false;
    }
    
    return false;
  }

  // Start rendering loop for mobile
  startRendering() {
    if (this.isRendering) return;
    
    this.isRendering = true;
    console.log('🎬 Starting mobile rendering loop');
    
    const render = () => {
      if (!this.isRendering) return;
      
      // Clear canvas
      if (this.context) {
        this.context.fillStyle = '#000000';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw test pattern to verify canvas is working
        this.drawTestPattern();
        
        this.frameCount++;
        
        // Log frame rendering
        if (this.frameCount % 60 === 0) {
          console.log(`📊 Mobile rendering: ${this.frameCount} frames rendered`);
          logger.log('Mobile frame rendered', { frameCount: this.frameCount });
        }
      }
      
      // Continue rendering loop
      this.animationId = requestAnimationFrame(render);
    };
    
    render();
  }

  // Draw test pattern to verify canvas is working
  drawTestPattern() {
    if (!this.context) return;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Draw gradient background
    const gradient = this.context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#FF0000');
    gradient.addColorStop(0.5, '#00FF00');
    gradient.addColorStop(1, '#0000FF');
    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, width, height);
    
    // Draw text
    this.context.fillStyle = '#FFFFFF';
    this.context.font = '24px Arial';
    this.context.textAlign = 'center';
    this.context.fillText('Mobile Video Test', width / 2, height / 2);
    
    // Draw frame counter
    this.context.fillStyle = '#FFFFFF';
    this.context.font = '16px Arial';
    this.context.textAlign = 'center';
    this.context.fillText(`Frame: ${this.frameCount}`, width / 2, height / 2 + 40);
  }

  // Stop rendering
  stopRendering() {
    this.isRendering = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    console.log('⏹️ Mobile rendering stopped');
  }

  // Cleanup
  destroy() {
    this.stopRendering();
    
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    
    this.canvas = null;
    this.context = null;
    this.frameCount = 0;
    console.log('🧹 Mobile video fix destroyed');
  }

  // Check if canvas is working
  isWorking() {
    return this.canvas && this.context && this.isRendering;
  }

  // Get rendering stats
  getStats() {
    return {
      canvasCreated: !!this.canvas,
      contextCreated: !!this.context,
      isRendering: this.isRendering,
      frameCount: this.frameCount,
      canvasSize: this.canvas ? {
        width: this.canvas.width,
        height: this.canvas.height
      } : null
    };
  }
}

// Global mobile video fix instance
const mobileVideoFix = new MobileVideoFix();

export default mobileVideoFix;

const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

class VideoChunkServer {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    this.clients = new Set();
    this.videoChunks = new Map();
    
    this.setupRoutes();
    this.setupWebSocket();
  }
  
  setupRoutes() {
    // Serve static files if needed
    this.app.use(express.static(path.join(__dirname, 'public')));
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', clients: this.clients.size });
    });
    
    // Video metadata endpoint
    this.app.get('/api/videos/:videoId/chunks', (req, res) => {
      const { videoId } = req.params;
      const chunks = this.videoChunks.get(videoId) || [];
      res.json({ chunks: chunks.map(c => c.metadata) });
    });
  }
  
  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('New client connected');
      this.clients.add(ws);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to video chunk server',
        timestamp: Date.now()
      }));
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Invalid JSON received:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid JSON format'
          }));
        }
      });
      
      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }
  
  handleMessage(ws, message) {
    const { type, videoId, position } = message;
    
    switch (type) {
      case 'request_video':
        this.handleVideoRequest(ws, message);
        break;
        
      case 'pause':
        this.handlePause(ws);
        break;
        
      case 'resume':
        this.handleResume(ws);
        break;
        
      case 'seek':
        this.handleSeek(ws, position);
        break;
        
      default:
        console.log('Unknown message type:', type);
    }
  }
  
  async handleVideoRequest(ws, message) {
    const { videoId, url } = message;
    console.log(`Video request: ${videoId} from ${url}`);
    
    // Start streaming video chunks
    this.startVideoStreaming(ws, videoId, url);
  }
  
  async startVideoStreaming(ws, videoId, url) {
    try {
      // Simulate video chunk generation
      // In a real implementation, this would:
      // 1. Download/stream the video
      // 2. Split it into chunks
      // 3. Send chunks to the client
      
      let chunkIndex = 0;
      const chunkInterval = setInterval(() => {
        if (this.clients.has(ws)) {
          const chunk = this.generateVideoChunk(videoId, chunkIndex, url);
          
          ws.send(JSON.stringify({
            type: 'video_chunk',
            ...chunk
          }));
          
          chunkIndex++;
          
          // Stop after 100 chunks (demo)
          if (chunkIndex >= 100) {
            clearInterval(chunkInterval);
          }
        } else {
          clearInterval(chunkInterval);
        }
      }, 50); // Send chunk every 50ms (20 chunks/second)
      
    } catch (error) {
      console.error('Error streaming video:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to stream video'
      }));
    }
  }
  
  generateVideoChunk(videoId, chunkIndex, videoUrl) {
    // Generate mock video chunk data
    const chunkSize = 1024; // 1KB chunks for demo
    const chunkData = Buffer.alloc(chunkSize, chunkIndex); // Fill with chunk index
    
    return {
      chunkId: `${videoId}_chunk_${chunkIndex}`,
      videoUrl,
      data: chunkData.toString('base64'),
      sequenceNumber: chunkIndex,
      isKeyFrame: chunkIndex % 30 === 0, // Every 30th chunk is a keyframe
      timestamp: Date.now(),
      metadata: {
        size: chunkSize,
        duration: 0.05, // 50ms per chunk
        bitrate: 1000000, // 1Mbps
        resolution: '1080x1920',
        codec: 'h264'
      }
    };
  }
  
  handlePause(ws) {
    console.log('Pause requested');
    ws.send(JSON.stringify({
      type: 'paused',
      timestamp: Date.now()
    }));
  }
  
  handleResume(ws) {
    console.log('Resume requested');
    ws.send(JSON.stringify({
      type: 'resumed',
      timestamp: Date.now()
    }));
  }
  
  handleSeek(ws, position) {
    console.log(`Seek to position: ${position}s`);
    ws.send(JSON.stringify({
      type: 'seeked',
      position,
      timestamp: Date.now()
    }));
  }
  
  start(port = 8080) {
    this.server.listen(port, () => {
      console.log(`🚀 Video Chunk Server running on port ${port}`);
      console.log(`📡 WebSocket server ready for connections`);
      console.log(`🌐 HTTP API available at http://localhost:${port}`);
    });
  }
  
  stop() {
    this.server.close(() => {
      console.log('Server stopped');
      this.clients.clear();
    });
  }
}

// Start the server
const server = new VideoChunkServer();
server.start(8080);

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.stop();
  process.exit(0);
});

module.exports = VideoChunkServer;

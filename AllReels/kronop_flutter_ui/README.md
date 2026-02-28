# Kronop Flutter UI

High-performance Flutter UI for Reels app with Rust decoder integration and Node.js bridge.

## Features

- **120 FPS Smooth Scrolling**: Optimized scroll physics for buttery smooth reel navigation
- **Rust FFI Integration**: Direct integration with Rust video decoder for maximum performance
- **Node.js Bridge**: WebSocket-based communication with Node.js backend for video chunks
- **CustomPainter Rendering**: Hardware-accelerated video rendering with Texture widgets
- **Real-time Video Processing**: Zero-delay video chunk processing and display

## Architecture

### Core Components

1. **FFI Bridge** (`lib/src/ffi/kronop_engine_ffi.dart`)
   - Direct Rust engine integration via dart:ffi
   - High-performance video frame processing
   - Memory management for video chunks

2. **Video Renderer** (`lib/src/widgets/video_renderer.dart`)
   - CustomPainter for video frame rendering
   - Texture widget integration
   - 120 FPS rendering pipeline

3. **Reels Scroll View** (`lib/src/widgets/reels_scroll_view.dart`)
   - Custom scroll physics for smooth navigation
   - View recycling for memory efficiency
   - Gesture handling for fling animations

4. **Node.js Bridge** (`lib/src/services/nodejs_bridge.dart`)
   - WebSocket communication
   - Video chunk streaming
   - Command handling

### Performance Optimizations

- **RepaintBoundary**: Minimizes widget rebuilds
- **Custom Scroll Physics**: Optimized for 120 FPS
- **Memory Management**: Efficient frame buffer handling
- **Hardware Acceleration**: GPU-based video rendering

## Setup

### Prerequisites

- Flutter SDK >=3.10.0
- Rust compiler (for building the video engine)
- Node.js backend running on ws://localhost:8080

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Build the Rust video engine:
   ```bash
   cd modules/kronop-video-engine
   cargo build --release
   ```

4. Run the Node.js backend:
   ```bash
   cd path/to/nodejs/backend
   npm start
   ```

5. Run the Flutter app:
   ```bash
   flutter run
   ```

## Usage

### Basic Reels Display

```dart
ReelsScrollView(
  reels: reels,
  onReelChanged: (reel) => print('Current: ${reel.username}'),
  onStar: (reel) => _starReel(reel.id),
  onComment: (reel) => _commentReel(reel.id),
  onShare: (reel) => _shareReel(reel.id),
  onSave: (reel) => _saveReel(reel.id),
  onSupport: (reel) => _supportCreator(reel.id),
)
```

### Video Engine Integration

```dart
final engine = VideoEngine();
await engine.initialize();
await engine.start();

// Add video chunks
await engine.addChunk(chunkId, chunkData);

// Get current frame
final frame = await engine.getCurrentFrame();
```

### Node.js Bridge

```dart
final bridge = NodeJSBridge();
await bridge.connect('ws://localhost:8080');

// Listen for video chunks
bridge.videoChunks.listen((chunk) {
  // Process video chunk
});

// Request video
bridge.requestVideo('https://example.com/video.mp4');
```

## Performance Metrics

The app is optimized for:

- **120 FPS** scrolling performance
- **<16ms** frame rendering time
- **<50MB** memory usage for video buffers
- **Zero lag** video chunk processing

## Debug Features

- FPS counter overlay (debug mode only)
- Performance monitoring
- Memory usage tracking
- Network latency metrics

## Platform Support

- **Android**: Full support with native libraries
- **iOS**: Full support with dynamic frameworks
- **Linux**: Desktop support
- **Windows**: Desktop support
- **macOS**: Desktop support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

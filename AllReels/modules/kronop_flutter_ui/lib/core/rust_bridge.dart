import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/services.dart';
import 'package:flutter_rust_bridge/flutter_rust_bridge.dart';

/// Rust Bridge for direct video decoding integration
class RustBridge {
  late DynamicLibrary _lib;
  late Function _decodeChunk;
  late Function _getCurrentFrame;
  late Function _initializeEngine;
  late Function _cleanupEngine;
  late Function _getEngineStats;
  
  bool _isInitialized = false;
  
  RustBridge();
  
  Future<void> initialize() async {
    try {
      // Load the Rust library
      final libPath = Platform.isAndroid 
          ? 'libkronop_video_engine.so'
          : 'libkronop_video_engine.dylib';
      
      _lib = Platform.isAndroid
          ? DynamicLibrary.open(libPath)
          : DynamicLibrary.executable();
      
      // Initialize Rust functions
      _initializeEngine = _lib.lookupFunction<Void Function()>('initialize_engine');
      _decodeChunk = _lib.lookupFunction<Pointer Function(Pointer, Pointer, Int32)>('decode_chunk');
      _getCurrentFrame = _lib.lookupFunction<Pointer Function(Int32)>('get_current_frame');
      _cleanupEngine = _lib.lookupFunction<Void Function()>('cleanup_engine');
      _getEngineStats = _lib.lookupFunction<Pointer Function()>('get_engine_stats');
      
      // Initialize the Rust engine
      _initializeEngine();
      
      _isInitialized = true;
      debugPrint('✅ Rust bridge initialized successfully');
      
    } catch (e) {
      debugPrint('❌ Failed to initialize Rust bridge: $e');
      rethrow;
    }
  }
  
  /// Decode a video chunk using Rust FFmpeg engine
  Future<Uint8List?> decodeChunk(String chunkId, Uint8List chunkData) async {
    if (!_isInitialized) {
      debugPrint('❌ Rust bridge not initialized');
      return null;
    }
    
    try {
      // Convert chunk data to native format
      final dataPtr = malloc.allocate<Uint8>(chunkData.length);
      for (int i = 0; i < chunkData.length; i++) {
        dataPtr[i] = chunkData[i];
      }
      
      // Convert chunk ID to native string
      final chunkIdPtr = chunkId.toNativeUtf8();
      
      // Call Rust decode function
      final resultPtr = _decodeChunk(dataPtr, chunkIdPtr, chunkData.length);
      
      // Get the decoded data
      final decodedData = _getDecodedData(resultPtr);
      
      // Free native memory
      free(dataPtr);
      free(chunkIdPtr);
      
      return decodedData;
      
    } catch (e) {
      debugPrint('❌ Failed to decode chunk: $e');
      return null;
    }
  }
  
  /// Get current frame data from Rust engine
  Future<Uint8List?> getCurrentFrame(int reelId) async {
    if (!_isInitialized) {
      debugPrint('❌ Rust bridge not initialized');
      return null;
    }
    
    try {
      // Call Rust get current frame function
      final framePtr = _getCurrentFrame(reelId);
      
      // Get frame data
      final frameData = _getFrameData(framePtr);
      
      return frameData;
      
    } catch (e) {
      debugPrint('❌ Failed to get current frame: $e');
      return null;
    }
  }
  
  /// Get engine statistics from Rust
  Future<Map<String, dynamic>> getEngineStats() async {
    if (!_isInitialized) {
      debugPrint('❌ Rust bridge not initialized');
      return {};
    }
    
    try {
      // Call Rust get stats function
      final statsPtr = _getEngineStats();
      
      // Parse stats
      final stats = _parseStats(statsPtr);
      
      return stats;
      
    } catch (e) {
      debugPrint('❌ Failed to get engine stats: $e');
      return {};
    }
  }
  
  /// Get decoded data from Rust pointer
  Uint8List _getDecodedData(Pointer dataPtr) {
    // Get data length (first 4 bytes)
    final length = dataPtr.cast<Int32>().value;
    
    // Get actual data
    final data = dataPtr.cast<Uint8>().asTypedList(length);
    
    return Uint8List.fromList(data);
  }
  
  /// Get frame data from Rust pointer
  Uint8List _getFrameData(Pointer framePtr) {
    // Get frame metadata
    final width = framePtr.cast<Int32>().value;
    final height = (framePtr + 4).cast<Int32>().value;
    final format = (framePtr + 8).cast<Int32>().value;
    final dataLength = width * height * 3; // RGB24 format
    
    // Get frame data
    final dataPtr = (framePtr + 12).cast<Uint8>();
    final data = dataPtr.asTypedList(dataLength);
    
    return Uint8List.fromList(data);
  }
  
  /// Parse engine statistics from Rust pointer
  Map<String, dynamic> _parseStats(Pointer statsPtr) {
    // Parse stats structure
    final chunksProcessed = statsPtr.cast<Int64>().value;
    final framesDecoded = (statsPtr + 8).cast<Int64>().value;
    final bufferUtilization = (statsPtr + 16).cast<Double>().value;
    final isRunning = (statsPtr + 24).cast<Bool>().value;
    final currentFPS = (statsPtr + 28).cast<Double>().value;
    final memoryUsage = (statsPtr + 36).cast<Int64>().value;
    final decodingSpeed = (statsPtr + 44).cast<Double>().value;
    
    return {
      'chunks_processed': chunksProcessed,
      'frames_decoded': framesDecoded,
      'buffer_utilization': bufferUtilization,
      'is_running': isRunning,
      'current_fps': currentFPS,
      'memory_usage': memoryUsage,
      'decoding_speed': decodingSpeed,
    };
  }
  
  /// Cleanup Rust engine
  void cleanup() {
    if (_isInitialized) {
      _cleanupEngine();
      _isInitialized = false;
      debugPrint('🧹 Rust bridge cleaned up');
    }
  }
  
  /// Check if bridge is initialized
  bool get isInitialized => _isInitialized;
}

/// Custom Painter for high-performance video rendering
class VideoPainter extends CustomPainter {
  final Uint8List frameData;
  final int width;
  final int height;
  
  VideoPainter({
    required this.frameData,
    required this.width,
    required this.height,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    if (frameData.isEmpty) return;
    
    // Convert frame data to Flutter image
    final image = _convertFrameToImage(frameData, width, height);
    
    if (image != null) {
      // Draw the image to fill the canvas
      final src = Rect.fromLTWH(0, 0, image.width.toDouble(), image.height.toDouble());
      final dst = Rect.fromLTWH(0, 0, size.width, size.height);
      
      canvas.drawImageRect(image, src, dst, Paint());
    }
  }
  
  @override
  bool shouldRepaint(covariant VideoPainter oldDelegate) {
    return oldDelegate.frameData != frameData;
  }
  
  /// Convert frame data to Flutter Image
  ui.Image? _convertFrameToImage(Uint8List frameData, int width, int height) {
    try {
      // Create codec for image data
      final codec = await ui.instantiateImageCodec(frameData.buffer.asUint8List());
      
      // Get frame
      final frame = await codec.getNextFrame();
      
      return frame.image;
      
    } catch (e) {
      debugPrint('❌ Failed to convert frame to image: $e');
      return null;
    }
  }
}

/// High-performance video renderer using CustomPainter
class VideoRenderer {
  final RustBridge rustBridge;
  final NodeBridge nodeBridge;
  
  int _currentReel = 0;
  Uint8List? _currentFrame;
  Timer? _renderTimer;
  bool _isRendering = false;
  
  VideoRenderer({
    required this.rustBridge,
    required this.nodeBridge,
  });
  
  Future<void> initialize() async {
    // Start rendering loop
    _startRenderingLoop();
    
    debugPrint('✅ Video renderer initialized');
  }
  
  void setCurrentReel(int reelIndex) {
    _currentReel = reelIndex;
    debugPrint('🎬 Set current reel to: $reelIndex');
  }
  
  void _startRenderingLoop() {
    _renderTimer = Timer.periodic(const Duration(milliseconds: 16), (timer) {
      _renderFrame();
    });
  }
  
  Future<void> _renderFrame() async {
    if (!_isRendering) return;
    
    try {
      // Get current frame from Rust engine
      final frameData = await rustBridge.getCurrentFrame(_currentReel);
      
      if (frameData != null && frameData.isNotEmpty) {
        _currentFrame = frameData;
        
        // Notify about frame update
        _onFrameUpdate(frameData);
      }
      
    } catch (e) {
      debugPrint('❌ Failed to render frame: $e');
    }
  }
  
  void _onFrameUpdate(Uint8List frameData) {
    // This would be called by the UI component
    // to update the CustomPainter
  }
  
  void startRendering() {
    _isRendering = true;
    debugPrint('▶️ Started video rendering');
  }
  
  void stopRendering() {
    _isRendering = false;
    debugPrint('⏸️ Stopped video rendering');
  }
  
  void dispose() {
    _renderTimer?.cancel();
    _currentFrame = null;
    debugPrint('🧹 Video renderer disposed');
  }
  
  Uint8List? get currentFrame => _currentFrame;
  int get currentReel => _currentReel;
  bool get isRendering => _isRendering;
}

import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../ffi/kronop_engine_ffi.dart';
import '../services/nodejs_bridge.dart';

class VideoRenderer extends StatefulWidget {
  final String videoUrl;
  final bool isActive;
  final VoidCallback? onTap;
  
  const VideoRenderer({
    Key? key,
    required this.videoUrl,
    this.isActive = false,
    this.onTap,
  }) : super(key: key);
  
  @override
  State<VideoRenderer> createState() => _VideoRendererState();
}

class _VideoRendererState extends State<VideoRenderer> 
    with SingleTickerProviderStateMixin {
  VideoEngine? _engine;
  Texture? _texture;
  int? _textureId;
  Timer? _renderTimer;
  Uint8List? _currentFrame;
  bool _isInitialized = false;
  late AnimationController _animationController;
  
  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 16), // ~60 FPS
    );
    _initializeEngine();
  }
  
  @override
  void didUpdateWidget(VideoRenderer oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    if (widget.isActive != oldWidget.isActive) {
      if (widget.isActive) {
        _startRendering();
      } else {
        _stopRendering();
      }
    }
    
    if (widget.videoUrl != oldWidget.videoUrl) {
      _loadVideo(widget.videoUrl);
    }
  }
  
  Future<void> _initializeEngine() async {
    try {
      _engine = VideoEngine();
      final initialized = await _engine!.initialize();
      
      if (initialized) {
        await _engine!.start();
        setState(() {
          _isInitialized = true;
        });
        
        if (widget.isActive) {
          _startRendering();
        }
        
        await _loadVideo(widget.videoUrl);
      }
    } catch (e) {
      print('Failed to initialize video engine: $e');
    }
  }
  
  Future<void> _loadVideo(String videoUrl) async {
    if (!_isInitialized || _engine == null) return;
    
    // This would typically set the video source in the Rust engine
    // For now, we'll simulate with the Node.js bridge
    final nodeJSBridge = NodeJSBridge();
    if (nodeJSBridge.isConnected) {
      nodeJSBridge.requestVideo(videoUrl);
    }
  }
  
  void _startRendering() {
    if (!_isInitialized || _engine == null) return;
    
    _renderTimer?.cancel();
    _renderTimer = Timer.periodic(
      const Duration(milliseconds: 8), // ~120 FPS
      (_) => _updateFrame(),
    );
    
    _animationController.repeat();
  }
  
  void _stopRendering() {
    _renderTimer?.cancel();
    _animationController.stop();
  }
  
  Future<void> _updateFrame() async {
    if (!_isInitialized || _engine == null) return;
    
    try {
      final frame = await _engine!.getCurrentFrame();
      if (frame != null && frame != _currentFrame) {
        setState(() {
          _currentFrame = frame;
        });
        
        // Create texture from frame data
        await _createTextureFromFrame(frame);
      }
    } catch (e) {
      print('Failed to update frame: $e');
    }
  }
  
  Future<void> _createTextureFromFrame(Uint8List frameData) async {
    try {
      // Decode frame data to create texture
      final codec = await ui.instantiateImageCodec(frameData);
      final frame = await codec.getNextFrame();
      final image = frame.image;
      
      // Create texture from image
      final texture = await image.createTextureFromImage();
      
      if (texture.textureId != _textureId) {
        setState(() {
          _texture = texture;
          _textureId = texture.textureId;
        });
      }
    } catch (e) {
      print('Failed to create texture: $e');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: Container(
        width: double.infinity,
        height: double.infinity,
        color: Colors.black,
        child: _buildVideoContent(),
      ),
    );
  }
  
  Widget _buildVideoContent() {
    if (_texture != null && _textureId != null) {
      return Texture(textureId: _textureId!);
    }
    
    if (_currentFrame != null) {
      return CustomPaint(
        painter: VideoFramePainter(_currentFrame!),
        size: Size.infinite,
      );
    }
    
    return Container(
      color: Colors.black,
      child: const Center(
        child: CircularProgressIndicator(
          color: Colors.white,
        ),
      ),
    );
  }
  
  @override
  void dispose() {
    _renderTimer?.cancel();
    _animationController.dispose();
    _engine?.dispose();
    _texture?.dispose();
    super.dispose();
  }
}

class VideoFramePainter extends CustomPainter {
  final Uint8List frameData;
  ui.Image? _image;
  
  VideoFramePainter(this.frameData);
  
  @override
  void paint(Canvas canvas, Size size) async {
    if (_image == null) {
      try {
        final codec = await ui.instantiateImageCodec(frameData);
        final frame = await codec.getNextFrame();
        _image = frame.image;
      } catch (e) {
        print('Failed to decode frame: $e');
        return;
      }
    }
    
    if (_image != null) {
      final paint = Paint()
        ..isAntiAlias = true
        ..filterQuality = FilterQuality.high;
      
      // Calculate aspect ratio and fit
      final imageSize = Size(_image!.width.toDouble(), _image!.height.toDouble());
      final fittedSize = applyBoxFit(BoxFit.cover, imageSize, size);
      final destinationRect = Alignment.center.inscribe(fittedSize, Offset.zero & size);
      
      canvas.drawImageRect(
        _image!,
        Offset.zero & imageSize,
        destinationRect,
        paint,
      );
    }
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return oldDelegate is! VideoFramePainter || 
           oldDelegate.frameData != frameData;
  }
}

class HighPerformanceVideoRenderer extends StatefulWidget {
  final String videoUrl;
  final bool isActive;
  final VoidCallback? onTap;
  
  const HighPerformanceVideoRenderer({
    Key? key,
    required this.videoUrl,
    this.isActive = false,
    this.onTap,
  }) : super(key: key);
  
  @override
  State<HighPerformanceVideoRenderer> createState() => _HighPerformanceVideoRendererState();
}

class _HighPerformanceVideoRendererState extends State<HighPerformanceVideoRenderer> {
  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: VideoRenderer(
        videoUrl: widget.videoUrl,
        isActive: widget.isActive,
        onTap: widget.onTap,
      ),
    );
  }
}

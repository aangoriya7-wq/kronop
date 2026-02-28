import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:kronop_flutter_ui/core/rust_bridge.dart';
import 'package:kronop_flutter_ui/core/node_bridge.dart';
import 'package:kronop_flutter_ui/state/video_state.dart';

/// High-performance video player widget using CustomPainter
class VideoPlayerWidget extends StatefulWidget {
  final int reelIndex;
  final VideoRenderer videoRenderer;
  final NodeBridge nodeBridge;
  final Function(Uint8List)? onFrameUpdate;
  
  const VideoPlayerWidget({
    super.key,
    required this.reelIndex,
    required this.videoRenderer,
    required this.nodeBridge,
    this.onFrameUpdate,
  });
  
  @override
  State<VideoPlayerWidget> createState() => _VideoPlayerWidgetState();
}

class _VideoPlayerWidgetState extends State<VideoPlayerWidget> 
    with TickerProviderStateMixin {
  
  Uint8List? _currentFrame;
  bool _isLoading = true;
  bool _hasError = false;
  String _errorMessage = '';
  
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  
  Timer? _frameUpdateTimer;
  DateTime _lastFrameTime = DateTime.now();
  int _fps = 0;
  
  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _loadVideo();
    _startFrameUpdates();
  }
  
  void _initializeAnimations() {
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeInOut,
    ));
    
    _fadeController.forward();
  }
  
  Future<void> _loadVideo() async {
    try {
      setState(() {
        _isLoading = true;
        _hasError = false;
        _errorMessage = '';
      });
      
      // Set current reel in renderer
      widget.videoRenderer.setCurrentReel(widget.reelIndex);
      
      // Start rendering
      widget.videoRenderer.startRendering();
      
      // Prefetch adjacent reels
      await _prefetchAdjacentReels();
      
      // Load first frame
      await _loadFirstFrame();
      
      setState(() {
        _isLoading = false;
      });
      
      // Fade in
      _fadeController.forward();
      
    } catch (e) {
      setState(() {
        _isLoading = false;
        _hasError = true;
        _errorMessage = e.toString();
      });
    }
  }
  
  Future<void> _loadFirstFrame() async {
    try {
      // Get current frame from Rust engine
      final frameData = await widget.videoRenderer.rustBridge.getCurrentFrame(widget.reelIndex);
      
      if (frameData != null && frameData.isNotEmpty) {
        setState(() {
          _currentFrame = frameData;
        });
        
        widget.onFrameUpdate?.call(frameData);
      }
      
    } catch (e) {
      debugPrint('❌ Failed to load first frame: $e');
    }
  }
  
  Future<void> _prefetchAdjacentReels() async {
    // Prefetch next reel
    await widget.nodeBridge.prefetchReel(widget.reelIndex + 1);
    
    // Prefetch previous reel
    if (widget.reelIndex > 0) {
      await widget.nodeBridge.prefetchReel(widget.reelIndex - 1);
    }
  }
  
  void _startFrameUpdates() {
    _frameUpdateTimer = Timer.periodic(const Duration(milliseconds: 16), (timer) {
      _updateFrame();
    });
  }
  
  Future<void> _updateFrame() async {
    try {
      // Get current frame from renderer
      final frameData = widget.videoRenderer.currentFrame;
      
      if (frameData != null && frameData.isNotEmpty) {
        final hasNewFrame = _currentFrame == null || 
            !_areFramesEqual(_currentFrame!, frameData);
        
        if (hasNewFrame) {
          setState(() {
            _currentFrame = frameData;
          });
          
          widget.onFrameUpdate?.call(frameData);
          
          // Update FPS
          _updateFPS();
        }
      }
      
    } catch (e) {
      debugPrint('❌ Failed to update frame: $e');
    }
  }
  
  bool _areFramesEqual(Uint8List frame1, Uint8List frame2) {
    if (frame1.length != frame2.length) return false;
    
    for (int i = 0; i < frame1.length; i++) {
      if (frame1[i] != frame2[i]) return false;
    }
    
    return true;
  }
  
  void _updateFPS() {
    final now = DateTime.now();
    final timeDiff = now.difference(_lastFrameTime).inMilliseconds;
    
    if (timeDiff > 0) {
      final fps = 1000 / timeDiff;
      setState(() {
        _fps = fps.round();
        _lastFrameTime = now;
      });
    }
  }
  
  @override
  void dispose() {
    _frameUpdateTimer?.cancel();
    _fadeController.dispose();
    widget.videoRenderer.stopRendering();
    super.dispose();
  }
  
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Stack(
        children: [
          // Video rendering area
          if (_currentFrame != null && _currentFrame!.isNotEmpty)
            _buildVideoFrame()
          else if (_isLoading)
            _buildLoadingIndicator()
          else if (_hasError)
            _buildErrorIndicator(),
          
          // Performance overlay
          _buildPerformanceOverlay(),
          
          // Touch gestures
          _buildGestureDetector(),
        ],
      ),
    );
  }
  
  Widget _buildVideoFrame() {
    return AnimatedBuilder(
      animation: _fadeAnimation,
      builder: (context, child) {
        return Opacity(
          opacity: _fadeAnimation.value,
          child: CustomPaint(
            painter: VideoFramePainter(
              frameData: _currentFrame!,
              width: 1080,
              height: 1920,
            ),
            size: Size.infinite,
          ),
        );
      },
    );
  }
  
  Widget _buildLoadingIndicator() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(
            color: Colors.purple,
            strokeWidth: 2,
          ),
          SizedBox(height: 20),
          Text(
            'Loading Video...',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            '🦀 Rust Engine + Flutter',
            style: TextStyle(
              color: Colors.grey,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildErrorIndicator() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            color: Colors.red,
            size: 48,
          ),
          SizedBox(height: 20),
          Text(
            'Video Load Error',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w500,
            ),
          ),
          SizedBox(height: 10),
          Text(
            _errorMessage,
            style: TextStyle(
              color: Colors.grey,
              fontSize: 14,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 20),
          ElevatedButton(
            onPressed: _loadVideo,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.purple,
              foregroundColor: Colors.white,
            ),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildPerformanceOverlay() {
    return Positioned(
      top: 20,
      right: 20,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.7),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.purple.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '$_fps FPS',
              style: const TextStyle(
                color: Colors.purple,
                fontSize: 12,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (_currentFrame != null)
              Text(
                '${(_currentFrame!.length / 1024).toStringAsFixed(1)} KB',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                ),
              ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildGestureDetector() {
    return GestureDetector(
      onTap: () {
        // Handle tap
        _handleTap();
      },
      onDoubleTap: () {
        // Handle double tap
        _handleDoubleTap();
      },
      onLongPress: () {
        // Handle long press
        _handleLongPress();
      },
      onVerticalDragStart: (details) {
        // Handle vertical drag start
        _handleVerticalDragStart(details);
      },
      onVerticalDragUpdate: (details) {
        // Handle vertical drag update
        _handleVerticalDragUpdate(details);
      },
      onVerticalDragEnd: (details) {
        // Handle vertical drag end
        _handleVerticalDragEnd(details);
      },
      child: Container(
        color: Colors.transparent,
      ),
    );
  }
  
  void _handleTap() {
    // Toggle play/pause
    debugPrint('👆 Video tapped');
  }
  
  void _handleDoubleTap() {
    // Like video
    debugPrint('👆👆 Video double tapped');
  }
  
  void _handleLongPress() {
    // Show options
    debugPrint('👆 Video long pressed');
  }
  
  void _handleVerticalDragStart(DragStartDetails details) {
    debugPrint('👆 Vertical drag started');
  }
  
  void _handleVerticalDragUpdate(DragUpdateDetails details) {
    final velocity = details.primaryDelta;
    
    // Send scroll speed to Node.js
    widget.nodeBridge.sendUserBehavior(
      reelId: widget.reelIndex,
      scrollSpeed: velocity.abs(),
      watchTime: 0.0,
      action: 'scroll',
    );
    
    debugPrint('👆 Vertical drag: ${velocity.toStringAsFixed(2)}');
  }
  
  void _handleVerticalDragEnd(DragEndDetails details) {
    debugPrint('👆 Vertical drag ended');
  }
}

/// Custom painter for video frames
class VideoFramePainter extends CustomPainter {
  final Uint8List frameData;
  final int width;
  final int height;
  
  VideoFramePainter({
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
  bool shouldRepaint(covariant VideoFramePainter oldDelegate) {
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

/// High-performance scroll detection widget
class ScrollDetector extends StatefulWidget {
  final Widget child;
  final Function(double)? onScrollSpeedChanged;
  final Function()? onScrollStart;
  final Function()? onScrollEnd;
  
  const ScrollDetector({
    super.key,
    required this.child,
    this.onScrollSpeedChanged,
    this.onScrollStart,
    this.onScrollEnd,
  });
  
  @override
  State<ScrollDetector> createState() => _ScrollDetectorState();
}

class _ScrollDetectorState extends State<ScrollDetector> {
  DateTime? _lastScrollTime;
  double _lastScrollPosition = 0.0;
  double _currentScrollSpeed = 0.0;
  Timer? _scrollSpeedTimer;
  
  @override
  Widget build(BuildContext context) {
    return NotificationListener<ScrollNotification>(
      onNotification: _handleScrollNotification,
      child: widget.child,
    );
  }
  
  bool _handleScrollNotification(ScrollNotification notification) {
    switch (notification.runtimeType) {
      case ScrollNotificationType.started:
        _onScrollStart();
        break;
      case ScrollNotificationType.updated:
        _onScrollUpdate(notification);
        break;
      case ScrollNotificationType.ended:
        _onScrollEnd();
        break;
    }
    
    return true;
  }
  
  void _onScrollStart() {
    _lastScrollTime = DateTime.now();
    _lastScrollPosition = 0.0;
    widget.onScrollStart?.call();
  }
  
  void _onScrollUpdate(ScrollNotification notification) {
    final now = DateTime.now();
    final currentPosition = notification.metrics.pixels;
    
    if (_lastScrollTime != null) {
      final timeDiff = now.difference(_lastScrollTime!).inMilliseconds;
      final positionDiff = currentPosition - _lastScrollPosition;
      
      if (timeDiff > 0) {
        _currentScrollSpeed = positionDiff / timeDiff * 1000; // pixels per second
        
        // Debounce scroll speed updates
        _scrollSpeedTimer?.cancel();
        _scrollSpeedTimer = Timer(const Duration(milliseconds: 100), (timer) {
          widget.onScrollSpeedChanged?.call(_currentScrollSpeed);
        });
      }
    }
    
    _lastScrollTime = now;
    _lastScrollPosition = currentPosition;
  }
  
  void _onScrollEnd() {
    _scrollSpeedTimer?.cancel();
    _currentScrollSpeed = 0.0;
    widget.onScrollEnd?.call();
  }
  
  @override
  void dispose() {
    _scrollSpeedTimer?.cancel();
    super.dispose();
  }
}

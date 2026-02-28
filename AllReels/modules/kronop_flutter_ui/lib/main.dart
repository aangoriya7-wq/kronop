import 'dart:async';
import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_rust_bridge/flutter_rust_bridge.dart';
import 'package:provider/provider.dart';
import 'package:riverpod/riverpod.dart';

import 'package:kronop_flutter_ui/core/rust_bridge.dart';
import 'package:kronop_flutter_ui/core/video_renderer.dart';
import 'package:kronop_flutter_ui/core/node_bridge.dart';
import 'package:kronop_flutter_ui/ui/reels_screen.dart';
import 'package:kronop_flutter_ui/ui/video_player_widget.dart';
import 'package:kronop_flutter_ui/state/reels_provider.dart';
import 'package:kronop_flutter_ui/state/video_state.dart';

void main() {
  runApp(const KronopFlutterApp());
}

class KronopFlutterApp extends StatelessWidget {
  const KronopFlutterApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kronop Reels',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.purple,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: Colors.black,
        textTheme: const TextTheme(
          bodyLarge: TextStyle(color: Colors.white),
          bodyMedium: TextStyle(color: Colors.white),
          bodySmall: TextStyle(color: Colors.white),
        ),
      ),
      home: const ReelsScreen(),
    );
  }
}

class ReelsScreen extends StatefulWidget {
  const ReelsScreen({super.key});

  @override
  State<ReelsScreen> createState() => _ReelsScreenState();
}

class _ReelsScreenState extends State<ReelsScreen> with TickerProviderStateMixin {
  late PageController _pageController;
  late VideoRenderer _videoRenderer;
  late NodeBridge _nodeBridge;
  late RustBridge _rustBridge;
  
  int _currentIndex = 0;
  bool _isInitialized = false;
  Timer? _fpsTimer;
  int _fps = 0;
  DateTime _lastFrameTime = DateTime.now();
  
  @override
  void initState() {
    super.initState();
    _initializeComponents();
    _setupPageController();
    _startFPSMonitoring();
  }

  Future<void> _initializeComponents() async {
    try {
      // Initialize Rust bridge for direct video decoding
      _rustBridge = RustBridge();
      await _rustBridge.initialize();
      
      // Initialize Node.js bridge for chunk streaming
      _nodeBridge = NodeBridge();
      await _nodeBridge.connect();
      
      // Initialize video renderer
      _videoRenderer = VideoRenderer(
        rustBridge: _rustBridge,
        nodeBridge: _nodeBridge,
      );
      
      await _videoRenderer.initialize();
      
      setState(() {
        _isInitialized = true;
      });
      
      // Start prefetching first reel
      _prefetchReel(_currentIndex);
      
    } catch (e) {
      debugPrint('❌ Failed to initialize components: $e');
    }
  }

  void _setupPageController() {
    _pageController = PageController();
    
    _pageController.addListener(() {
      final newIndex = _pageController.page?.round() ?? 0;
      if (newIndex != _currentIndex) {
        _currentIndex = newIndex;
        _onReelChanged(newIndex);
      }
    });
  }

  void _onReelChanged(int newIndex) {
    debugPrint('🎬 Reel changed to: $newIndex');
    
    // Prefetch adjacent reels
    _prefetchAdjacentReels(newIndex);
    
    // Update video renderer
    _videoRenderer.setCurrentReel(newIndex);
    
    // Notify Node.js bridge about reel change
    _nodeBridge.notifyReelChange(newIndex);
  }

  Future<void> _prefetchReel(int reelIndex) async {
    try {
      // Prefetch current reel chunks
      await _nodeBridge.prefetchReel(reelIndex);
      
      // Prefetch next reel chunks
      await _nodeBridge.prefetchReel(reelIndex + 1);
      
      // Prefetch previous reel chunks
      if (reelIndex > 0) {
        await _nodeBridge.prefetchReel(reelIndex - 1);
      }
      
    } catch (e) {
      debugPrint('❌ Failed to prefetch reel $reelIndex: $e');
    }
  }

  Future<void> _prefetchAdjacentReels(int currentIndex) async {
    // Prefetch next 2 reels
    for (int i = 1; i <= 2; i++) {
      await _nodeBridge.prefetchReel(currentIndex + i);
    }
    
    // Prefetch previous 1 reel
    if (currentIndex > 0) {
      await _nodeBridge.prefetchReel(currentIndex - 1);
    }
  }

  void _startFPSMonitoring() {
    _fpsTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      final now = DateTime.now();
      final fps = _calculateFPS(now);
      
      setState(() {
        _fps = fps;
        _lastFrameTime = now;
      });
    });
  }

  int _calculateFPS(DateTime now) {
    // Simple FPS calculation based on frame updates
    // In a real implementation, this would track actual frame renders
    return (_fps + 60) ~/ 2; // Target 60 FPS
  }

  @override
  void dispose() {
    _fpsTimer?.cancel();
    _pageController.dispose();
    _videoRenderer.dispose();
    _nodeBridge.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInitialized) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Colors.purple),
              SizedBox(height: 20),
              Text(
                'Initializing Kronop Engine...',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                'Rust + Flutter + Node.js',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Main video player
          PageView.builder(
            controller: _pageController,
            scrollDirection: Axis.vertical,
            itemCount: 1000, // Large number for infinite scrolling
            itemBuilder: (context, index) {
              return VideoPlayerWidget(
                reelIndex: index,
                videoRenderer: _videoRenderer,
                nodeBridge: _nodeBridge,
                onFrameUpdate: (frameData) {
                  // Handle frame updates
                  _updateFPS();
                },
              );
            },
          ),
          
          // FPS counter (debug)
          Positioned(
            top: 50,
            right: 20,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.purple.withOpacity(0.3)),
              ),
              child: Text(
                '$_fps FPS',
                style: const TextStyle(
                  color: Colors.purple,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          
          // Performance overlay
          Positioned(
            top: 50,
            left: 20,
            child: Consumer<VideoState>(
              builder: (context, videoState, child) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.green.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '🦀 Rust Engine',
                        style: TextStyle(
                          color: Colors.green,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        '⚡ ${videoState.currentFPS.toStringAsFixed(1)} FPS',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                      Text(
                        '🎬 Reel $_currentIndex',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                      if (videoState.isLoading)
                        const Text(
                          '⏳ Loading...',
                          style: TextStyle(
                            color: Colors.yellow,
                            fontSize: 10,
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
          
          // Scroll indicators
          Positioned(
            right: 10,
            top: 0,
            bottom: 0,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (index) {
                final isActive = index == (_currentIndex % 5);
                return Container(
                  margin: const EdgeInsets.symmetric(vertical: 2),
                  width: 4,
                  height: isActive ? 24 : 8,
                  decoration: BoxDecoration(
                    color: isActive ? Colors.white : Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(2),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
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
}

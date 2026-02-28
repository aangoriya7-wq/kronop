import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:ffi/ffi.dart';
import 'dart:ffi';
import 'dart:typed_data';
import 'dart:io';

class PerformanceMonitor {
  static const int _targetFPS = 120;
  static const Duration _targetFrameTime = Duration(microseconds: 8333); // ~120 FPS
  
  static final List<Duration> _frameTimes = [];
  static final List<double> _fpsValues = [];
  static int _frameCount = 0;
  static Stopwatch _stopwatch = Stopwatch();
  
  static void startFrame() {
    _stopwatch.reset();
    _stopwatch.start();
  }
  
  static void endFrame() {
    _stopwatch.stop();
    final frameTime = _stopwatch.elapsed;
    _frameTimes.add(frameTime);
    
    // Calculate FPS for this frame
    final fps = 1000000 / frameTime.inMicroseconds;
    _fpsValues.add(fps);
    
    _frameCount++;
    
    // Keep only last 60 frames for rolling average
    if (_frameTimes.length > 60) {
      _frameTimes.removeAt(0);
      _fpsValues.removeAt(0);
    }
  }
  
  static double getAverageFPS() {
    if (_fpsValues.isEmpty) return 0.0;
    return _fpsValues.reduce((a, b) => a + b) / _fpsValues.length;
  }
  
  static double getAverageFrameTime() {
    if (_frameTimes.isEmpty) return 0.0;
    final totalMicros = _frameTimes
        .map((d) => d.inMicroseconds)
        .reduce((a, b) => a + b);
    return totalMicros / _frameTimes.length / 1000.0; // Convert to ms
  }
  
  static bool isPerformant() {
    return getAverageFPS() >= _targetFPS * 0.9; // 90% of target
  }
  
  static void reset() {
    _frameTimes.clear();
    _fpsValues.clear();
    _frameCount = 0;
  }
}

class MemoryManager {
  static const int _maxBufferCount = 10;
  static const int _maxFrameSize = 1920 * 1080 * 4; // RGBA
  
  static final List<Uint8List> _frameBuffers = [];
  static int _currentBufferIndex = 0;
  
  static Uint8List getFrameBuffer() {
    if (_frameBuffers.length < _maxBufferCount) {
      final buffer = Uint8List(_maxFrameSize);
      _frameBuffers.add(buffer);
      return buffer;
    }
    
    // Reuse existing buffer
    final buffer = _frameBuffers[_currentBufferIndex];
    _currentBufferIndex = (_currentBufferIndex + 1) % _maxBufferCount;
    return buffer;
  }
  
  static void cleanup() {
    _frameBuffers.clear();
    _currentBufferIndex = 0;
  }
  
  static int getMemoryUsage() {
    return _frameBuffers.length * _maxFrameSize;
  }
}

class TextureManager {
  static final Map<int, Texture> _textures = {};
  static int _nextTextureId = 1;
  
  static int createTexture(Uint8List frameData) {
    final textureId = _nextTextureId++;
    // In a real implementation, this would create a GPU texture
    // For now, we'll simulate it
    _textures[textureId] = Texture(textureId);
    return textureId;
  }
  
  static Texture? getTexture(int textureId) {
    return _textures[textureId];
  }
  
  static void releaseTexture(int textureId) {
    _textures.remove(textureId);
  }
  
  static void cleanup() {
    _textures.clear();
  }
}

class Texture {
  final int textureId;
  
  Texture(this.textureId);
  
  void dispose() {
    TextureManager.releaseTexture(textureId);
  }
}

class FrameScheduler {
  static const Duration _targetInterval = Duration(microseconds: 8333); // 120 FPS
  
  static Timer? _timer;
  static VoidCallback? _callback;
  
  static void start(VoidCallback callback) {
    _callback = callback;
    _timer = Timer.periodic(_targetInterval, (_) {
      PerformanceMonitor.startFrame();
      _callback?.call();
      PerformanceMonitor.endFrame();
    });
  }
  
  static void stop() {
    _timer?.cancel();
    _timer = null;
  }
}

class GestureOptimizer {
  static const double _flingVelocityThreshold = 500.0;
  static const double _decelerationRate = 0.98;
  
  static double calculateFlingDistance(double velocity) {
    if (velocity.abs() < _flingVelocityThreshold) {
      return 0.0;
    }
    
    // Calculate distance using physics simulation
    final direction = velocity > 0 ? 1.0 : -1.0;
    final distance = (velocity.abs() / (1.0 - _decelerationRate)) * direction;
    
    return distance.clamp(-2000.0, 2000.0); // Limit max distance
  }
  
  static Duration calculateFlingDuration(double velocity) {
    if (velocity.abs() < _flingVelocityThreshold) {
      return Duration.zero;
    }
    
    final duration = (velocity.abs() / _flingVelocityThreshold) * 300;
    return Duration(milliseconds: duration.round()).clamp(
      Duration(milliseconds: 200),
      Duration(milliseconds: 600),
    );
  }
}

class CacheOptimizer {
  static const int _maxCacheSize = 50;
  static final Map<String, CachedItem> _cache = {};
  static final List<String> _accessOrder = [];
  
  static void put(String key, dynamic value) {
    if (_cache.length >= _maxCacheSize) {
      _evictLRU();
    }
    
    _cache[key] = CachedItem(value, DateTime.now());
    _accessOrder.add(key);
  }
  
  static T? get<T>(String key) {
    final item = _cache[key];
    if (item != null) {
      // Update access order
      _accessOrder.remove(key);
      _accessOrder.add(key);
      return item.value as T?;
    }
    return null;
  }
  
  static void _evictLRU() {
    if (_accessOrder.isNotEmpty) {
      final lruKey = _accessOrder.removeAt(0);
      _cache.remove(lruKey);
    }
  }
  
  static void clear() {
    _cache.clear();
    _accessOrder.clear();
  }
  
  static int get size => _cache.length;
}

class CachedItem {
  final dynamic value;
  final DateTime timestamp;
  
  CachedItem(this.value, this.timestamp);
}

class DeviceCapabilities {
  static bool get isHighEndDevice {
    // Check device capabilities
    return Platform.isIOS || 
           Platform.isAndroid && _getAndroidPerformanceClass() >= 8;
  }
  
  static int _getAndroidPerformanceClass() {
    // This would typically use device_info_plus package
    // For now, return a reasonable default
    return 8;
  }
  
  static int getTargetFPS() {
    return isHighEndDevice ? 120 : 60;
  }
  
  static int getMaxBufferCount() {
    return isHighEndDevice ? 15 : 8;
  }
}

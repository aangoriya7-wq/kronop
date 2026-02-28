const String serverUrl = 'ws://localhost:8080';
const int maxChunkSize = 1024 * 1024; // 1MB
const int targetFPS = 120;
const Duration frameInterval = Duration(microseconds: 8333); // ~120 FPS

class AppConstants {
  // Video settings
  static const int videoWidth = 1080;
  static const int videoHeight = 1920;
  static const String videoFormat = 'RGBA';
  
  // Performance settings
  static const int maxBufferFrames = 60;
  static const int maxCacheSize = 100;
  static const Duration cacheExpiry = Duration(minutes: 10);
  
  // UI settings
  static const double reelAspectRatio = 9.0 / 16.0;
  static const Duration animationDuration = Duration(milliseconds: 250);
  static const Curve animationCurve = Curves.easeOutCubic;
  
  // Network settings
  static const int connectionTimeout = 5000; // ms
  static const int receiveTimeout = 10000; // ms
  static const int maxRetries = 3;
  
  // Debug settings
  static const bool enablePerformanceOverlay = true;
  static const bool enableFPSCounter = true;
  static const bool enableMemoryMonitor = true;
}

import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Video state management using Riverpod
class VideoState extends StateNotifier<VideoStateData> {
  VideoState() : super(const VideoStateData());
  
  void updateFrame(Uint8List frameData) {
    state = state.copyWith(
      currentFrame: frameData,
      lastFrameTime: DateTime.now(),
    );
    
    // Update FPS
    _updateFPS();
  }
  
  void _updateFPS() {
    if (state.lastFrameTime != null) {
      final now = DateTime.now();
      final timeDiff = now.difference(state.lastFrameTime!).inMilliseconds;
      
      if (timeDiff > 0) {
        final fps = 1000 / timeDiff;
        state = state.copyWith(currentFPS: fps);
      }
    }
  }
  
  void setLoading(bool loading) {
    state = state.copyWith(isLoading: loading);
  }
  
  void setError(String error) {
    state = state.copyWith(
      hasError: true,
      errorMessage: error,
      isLoading: false,
    );
  }
  
  void clearError() {
    state = state.copyWith(
      hasError: false,
      errorMessage: '',
    );
  }
  
  void setReelIndex(int index) {
    state = state.copyWith(currentReelIndex: index);
  }
  
  void setStats(Map<String, dynamic> stats) {
    state = state.copyWith(
      chunksProcessed: stats['chunks_processed'] ?? 0,
      framesDecoded: stats['frames_decoded'] ?? 0,
      bufferUtilization: stats['buffer_utilization'] ?? 0.0,
      isRunning: stats['is_running'] ?? false,
      memoryUsage: stats['memory_usage'] ?? 0,
      decodingSpeed: stats['decoding_speed'] ?? 0.0,
    );
  }
  
  void updatePerformanceMetrics({
    double? currentFPS,
    double? decodingSpeed,
    int? memoryUsage,
    double? bufferUtilization,
  }) {
    state = state.copyWith(
      currentFPS: currentFPS ?? state.currentFPS,
      decodingSpeed: decodingSpeed ?? state.decodingSpeed,
      memoryUsage: memoryUsage ?? state.memoryUsage,
      bufferUtilization: bufferUtilization ?? state.bufferUtilization,
    );
  }
}

/// Video state data class
@immutable
class VideoStateData {
  final Uint8List? currentFrame;
  final DateTime? lastFrameTime;
  final double currentFPS;
  final bool isLoading;
  final bool hasError;
  final String errorMessage;
  final int currentReelIndex;
  
  // Rust engine stats
  final int chunksProcessed;
  final int framesDecoded;
  final double bufferUtilization;
  final bool isRunning;
  final int memoryUsage;
  final double decodingSpeed;
  
  const VideoStateData({
    this.currentFrame,
    this.lastFrameTime,
    this.currentFPS = 0.0,
    this.isLoading = false,
    this.hasError = false,
    this.errorMessage = '',
    this.currentReelIndex = 0,
    this.chunksProcessed = 0,
    this.framesDecoded = 0,
    this.bufferUtilization = 0.0,
    this.isRunning = false,
    this.memoryUsage = 0,
    this.decodingSpeed = 0.0,
  });
  
  VideoStateData copyWith({
    Uint8List? currentFrame,
    DateTime? lastFrameTime,
    double? currentFPS,
    bool? isLoading,
    bool? hasError,
    String? errorMessage,
    int? currentReelIndex,
    int? chunksProcessed,
    int? framesDecoded,
    double? bufferUtilization,
    bool? isRunning,
    int? memoryUsage,
    double? decodingSpeed,
  }) {
    return VideoStateData(
      currentFrame: currentFrame ?? this.currentFrame,
      lastFrameTime: lastFrameTime ?? this.lastFrameTime,
      currentFPS: currentFPS ?? this.currentFPS,
      isLoading: isLoading ?? this.isLoading,
      hasError: hasError ?? this.hasError,
      errorMessage: errorMessage ?? this.errorMessage,
      currentReelIndex: currentReelIndex ?? this.currentReelIndex,
      chunksProcessed: chunksProcessed ?? this.chunksProcessed,
      framesDecoded: framesDecoded ?? this.framesDecoded,
      bufferUtilization: bufferUtilization ?? this.bufferUtilization,
      isRunning: isRunning ?? this.isRunning,
      memoryUsage: memoryUsage ?? this.memoryUsage,
      decodingSpeed: decodingSpeed ?? this.decodingSpeed,
    );
  }
  
  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is VideoStateData &&
        other.currentFrame == currentFrame &&
        other.lastFrameTime == lastFrameTime &&
        other.currentFPS == currentFPS &&
        other.isLoading == isLoading &&
        other.hasError == hasError &&
        other.errorMessage == errorMessage &&
        other.currentReelIndex == currentReelIndex &&
        other.chunksProcessed == chunksProcessed &&
        other.framesDecoded == framesDecoded &&
        other.bufferUtilization == bufferUtilization &&
        other.isRunning == isRunning &&
        other.memoryUsage == memoryUsage &&
        other.decodingSpeed == decodingSpeed;
  }
  
  @override
  int get hashCode => Object.hash(
    currentFrame,
    lastFrameTime,
    currentFPS,
    isLoading,
    hasError,
    errorMessage,
    currentReelIndex,
    chunksProcessed,
    framesDecoded,
    bufferUtilization,
    isRunning,
    memoryUsage,
    decodingSpeed,
  );
}

/// Video state provider
final videoStateProvider = StateNotifierProvider<VideoState>((ref) => VideoState());

/// Extension for easy access to video state
extension VideoStateExtension on WidgetRef {
  VideoStateData get videoState => read(videoStateProvider);
  void updateVideoFrame(Uint8List frameData) => read(videoStateProvider).updateFrame(frameData);
  void setVideoLoading(bool loading) => read(videoStateProvider).setLoading(loading);
  void setVideoError(String error) => read(videoStateProvider).setError(error);
  void clearVideoError() => read(videoStateProvider).clearError();
  void setCurrentReel(int index) => read(videoStateProvider).setReelIndex(index);
  void updateVideoStats(Map<String, dynamic> stats) => read(videoStateProvider).setStats(stats);
}

/// Performance metrics provider
class PerformanceMetricsProvider extends StateNotifier<PerformanceMetrics> {
  PerformanceMetrics() : super(const PerformanceMetrics());
  
  void updateMetrics({
    double? fps,
    double? decodingSpeed,
    int? memoryUsage,
    double? bufferUtilization,
    bool? isHighPerformance,
    bool? isMemoryEfficient,
    bool? isThermalOptimal,
  }) {
    state = state.copyWith(
      fps: fps ?? state.fps,
      decodingSpeed: decodingSpeed ?? state.decodingSpeed,
      memoryUsage: memoryUsage ?? state.memoryUsage,
      bufferUtilization: bufferUtilization ?? state.bufferUtilization,
      isHighPerformance: isHighPerformance ?? state.isHighPerformance,
      isMemoryEfficient: isMemoryEfficient ?? state.isMemoryEfficient,
      isThermalOptimal: isThermalOptimal ?? state.isThermalOptimal,
    );
  }
  
  void updateFromVideoState(VideoStateData videoState) {
    updateMetrics(
      fps: videoState.currentFPS,
      decodingSpeed: videoState.decodingSpeed,
      memoryUsage: videoState.memoryUsage,
      bufferUtilization: videoState.bufferUtilization,
      isHighPerformance: videoState.currentFPS >= 55,
      isMemoryEfficient: videoState.memoryUsage < 200 * 1024 * 1024,
      isThermalOptimal: true, // Would need actual thermal data
    );
  }
}

/// Performance metrics data class
@immutable
class PerformanceMetrics {
  final double fps;
  final double decodingSpeed;
  final int memoryUsage;
  final double bufferUtilization;
  final bool isHighPerformance;
  final bool isMemoryEfficient;
  final bool isThermalOptimal;
  
  const PerformanceMetrics({
    this.fps = 0.0,
    this.decodingSpeed = 0.0,
    this.memoryUsage = 0,
    this.bufferUtilization = 0.0,
    this.isHighPerformance = false,
    this.isMemoryEfficient = false,
    this.isThermalOptimal = false,
  });
  
  PerformanceMetrics copyWith({
    double? fps,
    double? decodingSpeed,
    int? memoryUsage,
    double? bufferUtilization,
    bool? isHighPerformance,
    bool? isMemoryEfficient,
    bool? isThermalOptimal,
  }) {
    return PerformanceMetrics(
      fps: fps ?? this.fps,
      decodingSpeed: decodingSpeed ?? this.decodingSpeed,
      memoryUsage: memoryUsage ?? this.memoryUsage,
      bufferUtilization: bufferUtilization ?? this.bufferUtilization,
      isHighPerformance: isHighPerformance ?? this.isHighPerformance,
      isMemoryEfficient: isMemoryEfficient ?? this.isMemoryEfficient,
      isThermalOptimal: isThermalOptimal ?? this.isThermalOptimal,
    );
  }
  
  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is PerformanceMetrics &&
        other.fps == fps &&
        other.decodingSpeed == decodingSpeed &&
        other.memoryUsage == memoryUsage &&
        other.bufferUtilization == bufferUtilization &&
        other.isHighPerformance == isHighPerformance &&
        other.isMemoryEfficient == isMemoryEfficient &&
        other.isThermalOptimal == isThermalOptimal;
  }
  
  @override
  int get hashCode => Object.hash(
    fps,
    decodingSpeed,
    memoryUsage,
    bufferUtilization,
    isHighPerformance,
    isMemoryEfficient,
    isThermalOptimal,
  );
}

/// Performance metrics provider
final performanceMetricsProvider = StateNotifierProvider<PerformanceMetrics>((ref) => PerformanceMetrics());

/// Extension for easy access to performance metrics
extension PerformanceMetricsExtension on WidgetRef {
  PerformanceMetrics get performanceMetrics => read(performanceMetricsProvider);
  void updatePerformanceMetrics({
    double? fps,
    double? decodingSpeed,
    int? memoryUsage,
    double? bufferUtilization,
    bool? isHighPerformance,
    bool? isMemoryEfficient,
    bool? isThermalOptimal,
  }) => read(performanceMetricsProvider).updateMetrics(
    fps: fps,
    decodingSpeed: decodingSpeed,
    memoryUsage: memoryUsage,
    bufferUtilization: bufferUtilization,
    isHighPerformance: isHighPerformance,
    isMemoryEfficient: isMemoryEfficient,
    isThermalOptimal: isThermalOptimal,
  );
}

/// Reels state provider
class ReelsStateProvider extends StateNotifier<ReelsStateData> {
  ReelsStateProvider() : super(const ReelsStateData());
  
  void setCurrentReel(int index) {
    state = state.copyWith(currentReelIndex: index);
  }
  
  void setScrollSpeed(double speed) {
    state = state.copyWith(scrollSpeed: speed);
  }
  
  void setWatchTime(double time) {
    state = state.copyWith(watchTime: time);
  }
  
  void setUserType(String userType) {
    state = state.copyWith(userType: userType);
  }
  
  void setPrefetchCount(int count) {
    state = state.copyWith(prefetchCount: count);
  }
  
  void updateBehavior({
    double? scrollSpeed,
    double? watchTime,
    String? userType,
    int? prefetchCount,
  }) {
    state = state.copyWith(
      scrollSpeed: scrollSpeed ?? state.scrollSpeed,
      watchTime: watchTime ?? state.watchTime,
      userType: userType ?? state.userType,
      prefetchCount: prefetchCount ?? state.prefetchCount,
    );
  }
}

/// Reels state data class
@immutable
class ReelsStateData {
  final int currentReelIndex;
  final double scrollSpeed;
  final double watchTime;
  final String userType;
  final int prefetchCount;
  final DateTime lastActivity;
  
  const ReelsStateData({
    this.currentReelIndex = 0,
    this.scrollSpeed = 0.0,
    this.watchTime = 0.0,
    this.userType = 'normal_viewer',
    this.prefetchCount = 3,
    required this.lastActivity,
  });
  
  ReelsStateData copyWith({
    int? currentReelIndex,
    double? scrollSpeed,
    double? watchTime,
    String? userType,
    int? prefetchCount,
    DateTime? lastActivity,
  }) {
    return ReelsStateData(
      currentReelIndex: currentReelIndex ?? this.currentReelIndex,
      scrollSpeed: scrollSpeed ?? this.scrollSpeed,
      watchTime: watchTime ?? this.watchTime,
      userType: userType ?? this.userType,
      prefetchCount: prefetchCount ?? this.prefetchCount,
      lastActivity: lastActivity ?? DateTime.now(),
    );
  }
  
  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ReelsStateData &&
        other.currentReelIndex == currentReelIndex &&
        other.scrollSpeed == scrollSpeed &&
        other.watchTime == watchTime &&
        other.userType == userType &&
        other.prefetchCount == prefetchCount &&
        other.lastActivity == lastActivity;
  }
  
  @override
  int get hashCode => Object.hash(
    currentReelIndex,
    scrollSpeed,
    watchTime,
    userType,
    prefetchCount,
    lastActivity,
  );
}

/// Reels state provider
final reelsStateProvider = StateNotifierProvider<ReelsStateData>((ref) => ReelsStateData(
  lastActivity: DateTime.now(),
));

/// Extension for easy access to reels state
extension ReelsStateExtension on WidgetRef {
  ReelsStateData get reelsState => read(reelsStateProvider);
  void setCurrentReel(int index) => read(reelsStateProvider).setCurrentReel(index);
  void setScrollSpeed(double speed) => read(reelsStateProvider).setScrollSpeed(speed);
  void setWatchTime(double time) => read(reelsStateProvider).setWatchTime(time);
  void setUserType(String userType) => read(reelsStateProvider).setUserType(userType);
  void setPrefetchCount(int count) => read(reelsStateProvider).setPrefetchCount(count);
}

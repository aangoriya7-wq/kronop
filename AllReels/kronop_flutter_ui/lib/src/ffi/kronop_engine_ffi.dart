import 'dart:ffi';
import 'dart:io';
import 'dart:typed_data';
import 'package:ffi/ffi.dart';

// Rust FFI bindings for Kronop Video Engine

class KronopEngineFFI {
  static DynamicLibrary? _lib;
  
  static void initialize() {
    if (Platform.isAndroid || Platform.isLinux) {
      _lib = DynamicLibrary.open('libkronop_video_engine.so');
    } else if (Platform.isIOS) {
      _lib = DynamicLibrary.process();
    } else if (Platform.isWindows) {
      _lib = DynamicLibrary.open('kronop_video_engine.dll');
    } else if (Platform.isMacOS) {
      _lib = DynamicLibrary.open('libkronop_video_engine.dylib');
    } else {
      throw UnsupportedError('Platform not supported');
    }
  }
  
  // Engine initialization and management
  static late final Pointer<Void> Function() _kronop_engine_init;
  static late final int Function(Pointer<Void>) _kronop_engine_start;
  static late final int Function(Pointer<Void>) _kronop_engine_stop;
  static late final void Function(Pointer<Void>) _kronop_engine_cleanup;
  
  // Video processing
  static late final int Function(Pointer<Void>, Pointer<Utf8>, Pointer<Uint8>, int) _kronop_engine_add_chunk;
  static late final int Function(Pointer<Void>, Pointer<Pointer<Uint8>>, Pointer<IntPtr>) _kronop_engine_get_current_frame;
  
  static void loadFunctions() {
    if (_lib == null) initialize();
    
    _kronop_engine_init = _lib!.lookupFunction<Pointer<Void> Function(), Pointer<Void> Function()>('kronop_engine_init');
    _kronop_engine_start = _lib!.lookupFunction<Int32 Function(Pointer<Void>), int Function(Pointer<Void>)>('kronop_engine_start');
    _kronop_engine_stop = _lib!.lookupFunction<Int32 Function(Pointer<Void>), int Function(Pointer<Void>)>('kronop_engine_stop');
    _kronop_engine_cleanup = _lib!.lookupFunction<Void Function(Pointer<Void>), void Function(Pointer<Void>)>('kronop_engine_cleanup');
    
    _kronop_engine_add_chunk = _lib!.lookupFunction<Int32 Function(Pointer<Void>, Pointer<Utf8>, Pointer<Uint8>, IntPtr), int Function(Pointer<Void>, Pointer<Utf8>, Pointer<Uint8>, int)>('kronop_engine_add_chunk');
    _kronop_engine_get_current_frame = _lib!.lookupFunction<Int32 Function(Pointer<Void>, Pointer<Pointer<Uint8>>, Pointer<IntPtr>), int Function(Pointer<Void>, Pointer<Pointer<Uint8>>, Pointer<IntPtr>)>('kronop_engine_get_current_frame');
  }
}

class VideoEngine {
  Pointer<Void>? _enginePtr;
  bool _isInitialized = false;
  
  VideoEngine() {
    KronopEngineFFI.loadFunctions();
  }
  
  Future<bool> initialize() async {
    if (_isInitialized) return true;
    
    try {
      _enginePtr = KronopEngineFFI._kronop_engine_init();
      _isInitialized = _enginePtr != nullptr;
      return _isInitialized;
    } catch (e) {
      print('Failed to initialize video engine: $e');
      return false;
    }
  }
  
  Future<bool> start() async {
    if (!_isInitialized || _enginePtr == nullptr) return false;
    
    try {
      final result = KronopEngineFFI._kronop_engine_start(_enginePtr!);
      return result == 0;
    } catch (e) {
      print('Failed to start video engine: $e');
      return false;
    }
  }
  
  Future<bool> stop() async {
    if (!_isInitialized || _enginePtr == nullptr) return false;
    
    try {
      final result = KronopEngineFFI._kronop_engine_stop(_enginePtr!);
      return result == 0;
    } catch (e) {
      print('Failed to stop video engine: $e');
      return false;
    }
  }
  
  Future<bool> addChunk(String chunkId, Uint8List data) async {
    if (!_isInitialized || _enginePtr == nullptr) return false;
    
    try {
      final chunkIdCStr = chunkId.toNativeUtf8();
      final dataPtr = malloc.allocate<Uint8>(data.length);
      
      // Copy data to native memory
      for (int i = 0; i < data.length; i++) {
        dataPtr[i] = data[i];
      }
      
      final result = KronopEngineFFI._kronop_engine_add_chunk(
        _enginePtr!,
        chunkIdCStr,
        dataPtr,
        data.length,
      );
      
      // Clean up
      malloc.free(chunkIdCStr);
      malloc.free(dataPtr);
      
      return result == 0;
    } catch (e) {
      print('Failed to add chunk: $e');
      return false;
    }
  }
  
  Future<Uint8List?> getCurrentFrame() async {
    if (!_isInitialized || _enginePtr == nullptr) return null;
    
    try {
      final frameDataPtr = malloc.allocate<Pointer<Uint8>>();
      final frameLenPtr = malloc.allocate<IntPtr>();
      
      final result = KronopEngineFFI._kronop_engine_get_current_frame(
        _enginePtr!,
        frameDataPtr,
        frameLenPtr,
      );
      
      if (result == 0) {
        final frameData = frameDataPtr.value;
        final frameLen = frameLenPtr.value;
        
        if (frameData != nullptr && frameLen > 0) {
          final frameBytes = Uint8List(frameLen);
          for (int i = 0; i < frameLen; i++) {
            frameBytes[i] = frameData[i];
          }
          
          // Clean up
          malloc.free(frameDataPtr);
          malloc.free(frameLenPtr);
          // Note: frameData should be freed by Rust side or we need a cleanup function
          
          return frameBytes;
        }
      }
      
      // Clean up
      malloc.free(frameDataPtr);
      malloc.free(frameLenPtr);
      
      return null;
    } catch (e) {
      print('Failed to get current frame: $e');
      return null;
    }
  }
  
  void dispose() {
    if (_enginePtr != nullptr) {
      KronopEngineFFI._kronop_engine_cleanup(_enginePtr!);
      _enginePtr = nullptr;
    }
    _isInitialized = false;
  }
}

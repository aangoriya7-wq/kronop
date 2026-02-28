import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';

/// Node.js Bridge for chunk streaming and communication
class NodeBridge {
  static const String _baseUrl = 'http://localhost:8080';
  static const String _wsUrl = 'ws://localhost:8080/ws';
  
  WebSocketChannel? _wsChannel;
  bool _isConnected = false;
  Map<String, Uint8List> _chunkCache = {};
  Map<int, List<String>> _reelChunks = {};
  
  // Callbacks
  Function(Uint8List)? _onChunkReceived;
  Function(String)? _onError;
  Function()? _onConnected;
  Function()? _onDisconnected;
  
  NodeBridge();
  
  Future<void> connect() async {
    try {
      // Connect to WebSocket for real-time communication
      _wsChannel = WebSocketChannel.connect(_wsUrl);
      
      _wsChannel!.stream.listen(
        (message) {
          _handleWebSocketMessage(message);
        },
        onError: (error) {
          debugPrint('❌ WebSocket error: $error');
          _onError?.call(error.toString());
        },
        onDone: () {
          debugPrint('🔌 WebSocket disconnected');
          _isConnected = false;
          _onDisconnected?.call();
        },
      );
      
      // Test HTTP connection
      final response = await http.get(Uri.parse('$_baseUrl/api/v1/health'));
      
      if (response.statusCode == 200) {
        _isConnected = true;
        debugPrint('✅ Connected to Node.js bridge');
        _onConnected?.call();
      } else {
        throw Exception('HTTP health check failed: ${response.statusCode}');
      }
      
    } catch (e) {
      debugPrint('❌ Failed to connect to Node.js bridge: $e');
      _onError?.call(e.toString());
      rethrow;
    }
  }
  
  void _handleWebSocketMessage(dynamic message) {
    try {
      if (message is String) {
        final data = jsonDecode(message) as Map<String, dynamic>;
        _handleJsonMessage(data);
      }
    } catch (e) {
      debugPrint('❌ Failed to handle WebSocket message: $e');
    }
  }
  
  void _handleJsonMessage(Map<String, dynamic> data) {
    final type = data['type'] as String?;
    
    switch (type) {
      case 'chunk':
        _handleChunkMessage(data);
        break;
      case 'error':
        _handleErrorMessage(data);
        break;
      case 'status':
        _handleStatusMessage(data);
        break;
      default:
        debugPrint('⚠️ Unknown message type: $type');
    }
  }
  
  void _handleChunkMessage(Map<String, dynamic> data) {
    try {
      final reelId = data['reel_id'] as int;
      final chunkId = data['chunk_id'] as String;
      final chunkData = base64Decode(data['data'] as String);
      
      // Cache the chunk
      _chunkCache[chunkId] = chunkData;
      
      // Add to reel chunks mapping
      if (!_reelChunks.containsKey(reelId)) {
        _reelChunks[reelId] = [];
      }
      _reelChunks[reelId]!.add(chunkId);
      
      debugPrint('📦 Received chunk: reel=$reelId, chunk=$chunkId, size=${chunkData.length}');
      
      // Notify about chunk received
      _onChunkReceived?.call(chunkData);
      
    } catch (e) {
      debugPrint('❌ Failed to handle chunk message: $e');
    }
  }
  
  void _handleErrorMessage(Map<String, dynamic> data) {
    final error = data['error'] as String;
    debugPrint('❌ Error from Node.js: $error');
    _onError?.call(error);
  }
  
  void _handleStatusMessage(Map<String, dynamic> data) {
    final status = data['status'] as String;
    debugPrint('📊 Status from Node.js: $status');
  }
  
  /// Prefetch a reel by requesting chunks from Node.js
  Future<void> prefetchReel(int reelId) async {
    if (!_isConnected) {
      debugPrint('❌ Not connected to Node.js bridge');
      return;
    }
    
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/v1/prefetch'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'reel_id': reelId,
          'count': 5, // Prefetch 5 chunks
          'priority': 'high',
        }),
      );
      
      if (response.statusCode == 200) {
        debugPrint('✅ Prefetch request sent for reel: $reelId');
      } else {
        debugPrint('❌ Prefetch request failed: ${response.statusCode}');
      }
      
    } catch (e) {
      debugPrint('❌ Failed to prefetch reel: $e');
    }
  }
  
  /// Get cached chunk data
  Uint8List? getCachedChunk(String chunkId) {
    return _chunkCache[chunkId];
  }
  
  /// Get all cached chunks for a reel
  List<Uint8List> getCachedReelChunks(int reelId) {
    final chunks = <Uint8List>[];
    
    if (_reelChunks.containsKey(reelId)) {
      for (final chunkId in _reelChunks[reelId]!) {
        final chunkData = _chunkCache[chunkId];
        if (chunkData != null) {
          chunks.add(chunkData);
        }
      }
    }
    
    return chunks;
  }
  
  /// Notify Node.js about reel change
  void notifyReelChange(int reelId) {
    if (!_isConnected) return;
    
    final message = jsonEncode({
      'type': 'reel_change',
      'reel_id': reelId,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
    
    _wsChannel?.sink.add(message);
  }
  
  /// Send user behavior data to Node.js
  void sendUserBehavior({
    required int reelId,
    required double scrollSpeed,
    required double watchTime,
    required String action,
  }) {
    if (!_isConnected) return;
    
    final message = jsonEncode({
      'type': 'user_behavior',
      'reel_id': reelId,
      'scroll_speed': scrollSpeed,
      'watch_time': watchTime,
      'action': action,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
    
    _wsChannel?.sink.add(message);
  }
  
  /// Get statistics from Node.js
  Future<Map<String, dynamic>?> getStats() async {
    if (!_isConnected) return null;
    
    try {
      final response = await http.get(Uri.parse('$_baseUrl/api/v1/metrics'));
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      
    } catch (e) {
      debugPrint('❌ Failed to get stats: $e');
    }
    
    return null;
  }
  
  /// Clear chunk cache
  void clearCache() {
    _chunkCache.clear();
    _reelChunks.clear();
    debugPrint('🗑️ Chunk cache cleared');
  }
  
  /// Get cache statistics
  Map<String, dynamic> getCacheStats() {
    final totalChunks = _chunkCache.length;
    final totalReels = _reelChunks.length;
    
    int totalSize = 0;
    for (final chunk in _chunkCache.values) {
      totalSize += chunk.length;
    }
    
    return {
      'total_chunks': totalChunks,
      'total_reels': totalReels,
      'total_size': totalSize,
      'avg_chunk_size': totalChunks > 0 ? totalSize / totalChunks : 0,
    };
  }
  
  /// Set callbacks
  void setCallbacks({
    Function(Uint8List)? onChunkReceived,
    Function(String)? onError,
    Function()? onConnected,
    Function()? onDisconnected,
  }) {
    _onChunkReceived = onChunkReceived;
    _onError = onError;
    _onConnected = onConnected;
    _onDisconnected = onDisconnected;
  }
  
  /// Check if connected
  bool get isConnected => _isConnected;
  
  /// Disconnect from Node.js bridge
  void disconnect() {
    _wsChannel?.sink.close();
    _wsChannel = null;
    _isConnected = false;
    debugPrint('🔌 Disconnected from Node.js bridge');
  }
  
  /// Send heartbeat to keep connection alive
  Timer? _heartbeatTimer;
  
  void startHeartbeat() {
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      if (_isConnected) {
        final message = jsonEncode({
          'type': 'heartbeat',
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        });
        _wsChannel?.sink.add(message);
      }
    });
  }
  
  void stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }
  
  /// Request specific chunk
  Future<Uint8List?> requestChunk(int reelId, String chunkId) async {
    if (!_isConnected) return null;
    
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/v1/chunk'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'reel_id': reelId,
          'chunk_id': chunkId,
        }),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final chunkData = base64Decode(data['data'] as String);
        
        // Cache the chunk
        _chunkCache[chunkId] = chunkData;
        
        return chunkData;
      }
      
    } catch (e) {
      debugPrint('❌ Failed to request chunk: $e');
    }
    
    return null;
  }
  
  /// Batch request multiple chunks
  Future<Map<String, Uint8List>> requestMultipleChunks(int reelId, List<String> chunkIds) async {
    if (!_isConnected) return {};
    
    final results = <String, Uint8List>{};
    
    for (final chunkId in chunkIds) {
      final chunkData = await requestChunk(reelId, chunkId);
      if (chunkData != null) {
        results[chunkId] = chunkData;
      }
    }
    
    return results;
  }
  
  /// Prefetch multiple reels
  Future<void> prefetchMultipleReels(List<int> reelIds) async {
    for (final reelId in reelIds) {
      await prefetchReel(reelId);
    }
  }
  
  /// Get connection status
  Map<String, dynamic> getConnectionStatus() {
    return {
      'connected': _isConnected,
      'websocket_connected': _wsChannel != null,
      'cached_chunks': _chunkCache.length,
      'cached_reels': _reelChunks.length,
    };
  }
}

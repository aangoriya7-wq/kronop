import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:web_socket_channel/web_socket_channel.dart';

class NodeJSBridge {
  late WebSocketChannel _channel;
  bool _isConnected = false;
  final StreamController<VideoChunk> _chunkController = StreamController.broadcast();
  final StreamController<Map<String, dynamic>> _commandController = StreamController.broadcast();
  
  Stream<VideoChunk> get videoChunks => _chunkController.stream;
  Stream<Map<String, dynamic>> get commands => _commandController.stream;
  
  Future<bool> connect(String url) async {
    try {
      _channel = WebSocketChannel.connect(Uri.parse(url));
      await _channel.ready;
      
      _isConnected = true;
      
      // Listen for messages
      _channel.stream.listen(
        (message) {
          _handleMessage(message);
        },
        onError: (error) {
          print('WebSocket error: $error');
          _isConnected = false;
        },
        onDone: () {
          print('WebSocket connection closed');
          _isConnected = false;
        },
      );
      
      return true;
    } catch (e) {
      print('Failed to connect to Node.js server: $e');
      return false;
    }
  }
  
  void _handleMessage(dynamic message) {
    try {
      final data = jsonDecode(message) as Map<String, dynamic>;
      final type = data['type'] as String?;
      
      switch (type) {
        case 'video_chunk':
          final chunk = VideoChunk.fromJson(data);
          _chunkController.add(chunk);
          break;
          
        case 'command':
          _commandController.add(data);
          break;
          
        default:
          print('Unknown message type: $type');
      }
    } catch (e) {
      print('Failed to parse message: $e');
    }
  }
  
  void sendCommand(Map<String, dynamic> command) {
    if (_isConnected) {
      _channel.sink.add(jsonEncode(command));
    }
  }
  
  void requestVideo(String videoUrl) {
    sendCommand({
      'type': 'request_video',
      'url': videoUrl,
    });
  }
  
  void pauseVideo() {
    sendCommand({'type': 'pause'});
  }
  
  void resumeVideo() {
    sendCommand({'type': 'resume'});
  }
  
  void seekTo(double position) {
    sendCommand({
      'type': 'seek',
      'position': position,
    });
  }
  
  bool get isConnected => _isConnected;
  
  void disconnect() {
    _channel.sink.close();
    _isConnected = false;
  }
  
  void dispose() {
    disconnect();
    _chunkController.close();
    _commandController.close();
  }
}

class VideoChunk {
  final String chunkId;
  final String videoUrl;
  final Uint8List data;
  final int sequenceNumber;
  final bool isKeyFrame;
  final int timestamp;
  
  VideoChunk({
    required this.chunkId,
    required this.videoUrl,
    required this.data,
    required this.sequenceNumber,
    required this.isKeyFrame,
    required this.timestamp,
  });
  
  factory VideoChunk.fromJson(Map<String, dynamic> json) {
    return VideoChunk(
      chunkId: json['chunkId'] as String,
      videoUrl: json['videoUrl'] as String,
      data: base64Decode(json['data'] as String),
      sequenceNumber: json['sequenceNumber'] as int,
      isKeyFrame: json['isKeyFrame'] as bool? ?? false,
      timestamp: json['timestamp'] as int? ?? 0,
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'chunkId': chunkId,
      'videoUrl': videoUrl,
      'data': base64Encode(data),
      'sequenceNumber': sequenceNumber,
      'isKeyFrame': isKeyFrame,
      'timestamp': timestamp,
    };
  }
}

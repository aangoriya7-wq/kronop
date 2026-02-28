import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:phoenix_socket/phoenix_socket.dart';

/// Phoenix Socket service for real-time communication with Elixir backend
class PhoenixSocket {
  static const String _baseUrl = 'ws://localhost:4000/ws';
  
  late PhoenixSocket _socket;
  final Map<String, PhoenixChannel> _channels = {};
  final Map<String, Function(dynamic)> _messageHandlers = {};
  bool _isConnected = false;
  
  PhoenixSocket._();
  
  /// Connect to Phoenix server
  Future<void> connect() async {
    try {
      _socket = PhoenixSocket.connect(_baseUrl);
      _isConnected = true;
      
      // Set up connection status callback
      _socket.onOpen(() {
        print('🔗 Connected to Phoenix server');
      });
      
      _socket.onClose(() {
        _isConnected = false;
        print('🔌 Disconnected from Phoenix server');
      });
      
      _socket.onError((error) {
        print('❌ Phoenix socket error: $error');
      });
      
      print('✅ Phoenix socket connected');
    } catch (e) {
      print('❌ Failed to connect to Phoenix: $e');
      _isConnected = false;
    }
  }
  
  /// Disconnect from Phoenix server
  void disconnect() {
    if (_socket != null) {
      _socket.disconnect();
      _socket = null;
    }
    _isConnected = false;
  }
  
  /// Join a channel
  Future<PhoenixChannel> join(String channel, Map<String, dynamic> params) async {
    if (!_isConnected) {
      await connect();
    }
    
    try {
      final channel = _socket.channel(channel);
      await channel.join(params);
      _channels[channel] = channel;
      
      print('📡 Joined channel: $channel');
      return channel;
    } catch (e) {
      print('❌ Failed to join channel: $e');
      throw e;
    }
  }
  
  /// Leave a channel
  Future<void> leave(String channel) async {
    if (_channels.containsKey(channel)) {
      final channel = _channels[channel]!;
      await channel.leave();
      _channels.remove(channel);
      print('📡 Left channel: $channel');
    }
  }
  
  /// Send message to a channel
  Future<void> sendMessage(String channel, Map<String, dynamic> message) async {
    if (!_channels.containsKey(channel)) {
      throw Exception('Channel not found: $channel');
    }
    
    try {
      final channel = _channels[channel]!;
      await channel.push(message);
      print('📤 Sent message to $channel: $message');
    } catch (e) {
      print('❌ Failed to send message: $e');
      throw e;
    }
  }
  
  /// Listen to messages from a channel
  void onMessage(String channel, Function(dynamic) onMessage) {
    if (_channels.containsKey(channel)) {
      final channel = _channels[channel]!;
      channel.onMessage((message) {
        onMessage(message);
      });
      _messageHandlers[channel] = onMessage;
    }
  }
  
  /// Get channel
  PhoenixChannel? getChannel(String channel) {
    return _channels[channel];
  }
  
  /// Check if connected
  bool get isConnected() => _isConnected;
  }
  
  /// Set message handler for a channel
  void setMessageHandler(String channel, Function(dynamic) onMessage) {
    _messageHandlers[channel] = onMessage;
  }
  
  /// Get all channels
  Map<String, PhoenixChannel> getChannels() {
    return Map.from(_channels);
  }
  
  /// Get message handlers
  Map<String, Function(dynamic)> getMessageHandlers() {
    return Map.from(_messageHandlers);
  }
  
  /// Close all channels and disconnect
  Future<void> close() async {
    // Leave all channels
    for (final channel in _channels.values) {
      await channel.leave();
    }
    
    // Disconnect from socket
    disconnect();
  }
}

/// Phoenix Channel wrapper
class PhoenixChannel {
  final PhoenixChannel _channel;
  
  PhoenixChannel(this._channel);
  
  /// Join a channel
  Future<void> join(Map<String, dynamic> params) async {
    await _channel.join(params);
  }
  
  /// Leave a channel
  Future<void> leave() async {
    await _channel.leave();
  }
  
  /// Send message
  Future<void> push(Map<String, dynamic> event) async {
    await _channel.push(event);
  }
  
  /// Listen to messages
  void onMessage(Function(dynamic) onMessage) {
    _channel.onMessage((message) => onMessage(message));
  }
  
  /// Get channel info
  Map<String, dynamic> getInfo() {
    return _channel.joinRef;
  }
  
  /// Get join reference
  PhoenixChannel get joinRef => _channel;
  
  /// Set callback for messages
  void onJoin(Function() onJoin(Function() onJoin) {
    _channel.onJoin((_) => onJoin());
  }
  
  /// Set callback for close
  void onClose(Function() onClose) {
    _channel.onClose(() => onClose());
  }
  
  /// Set callback for error
  void onError(Function(String) onError) {
    _channel.onError((error) => onError(error));
  }
}

/// Real-time updates listener
class RealtimeListener {
  final PhoenixSocket _socket;
  final Map<String, Function(dynamic)> _listeners = {};
  
  RealtimeListener(this._socket);
  
  RealtimeListener._socket = PhoenixSocket._();
  
  /// Start listening for real-time updates
  Future<void> start() async {
    await _socket.connect();
    
    // Join interaction channels
    await _socket.join('interaction:updates');
    await _socket.join('user:updates');
    await _socket.join('reel:updates');
    
    // Set up message handlers
    _socket.onMessage((message) {
      _handleRealtimeMessage(message);
    });
    
    print('🔔 Real-time listener started');
  }
  
  /// Stop listening
  void stop() {
    _socket.close();
  }
  
  /// Listen for specific interaction type
  void onInteractionUpdate(String interactionType, Function(Map<String, dynamic>) onInteraction) {
    _listeners[interactionType] = onInteraction;
  }
  
  /// Listen for user updates
  void onUserUpdate(Function(Map<String, dynamic>) onUserUpdate) {
    _listeners['user_updates'] = onUserUpdate;
  }
  
  /// Listen for reel updates
  void onReelUpdate(Function(Map<String, dynamic>) onReelUpdate {
    _listeners['reel_updates'] = onReelUpdate;
  }
  
  /// Handle real-time messages
  void _handleRealtimeMessage(message) {
    final type = message['type'] as String?;
    final data = message['data'] as Map<String, dynamic>?;
    
    switch (type) {
      'like_update':
        final onInteraction = _listeners['like_update'];
        if (onInteraction != null) {
          onInteraction(data);
        }
        break;
      
      'comment_update':
        final onInteraction = _listeners['comment_update'];
        if (onInteraction != null) {
          onInteraction(data);
        }
        break;
      
      'share_update':
        final onInteraction = _listeners['share_update'];
        if (onInteraction != null) {
          onInteraction(data);
        }
        break;
      
      'save_update':
        final onInteraction = _listeners['save_update'];
        if (onInteraction != null) {
          onInteraction(data);
        }
        break;
      
      'support_update':
        final onInteraction = _listeners['support_update'];
        if (onInteraction != null) {
          onInteraction(data);
        }
        break;
      
      'user_update':
        final onUserUpdate = _listeners['user_updates'];
        if (onUserUpdate != null) {
          onUserUpdate(data);
        }
        break;
      
      'reel_update':
        final onReelUpdate = _listeners['reel_updates'];
        if (onReelUpdate != null) {
          onReelUpdate(data);
        }
        break;
      
      default:
        print('⚠️ Unknown message type: $type');
    }
  }
}

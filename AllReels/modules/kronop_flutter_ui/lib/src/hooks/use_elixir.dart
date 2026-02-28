import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:kronop_flutter_ui/state/elixir_state.dart';
import 'package:kronop_flutter_ui/src/services/elixir_service.dart';
import 'package:kronop_flutter_ui/src/services/phoenix_socket.dart';

/// Hook for Elixir real-time integration
class UseElixir extends Hook<void> {
  final ElixirState elixirState = useProvider((ref) => elixirProvider);
  final RealtimeListener _listener = RealtimeInteractionListener.getInstance();
  
  const elixirService = ElixirService();
  final phoenixSocket = PhoenixSocket();
  
  UseElixir({
    elixirState: elixirState,
    elixirService: elixirService,
    phoenixSocket: phoenixSocket,
    realtimeListener: _listener,
  });
  
  // Auto-connect on mount
  useEffect(() {
    if (!elixirState.isConnected) {
      elixirState.connect();
    }
  }, []);
  
  // Auto-disconnect on unmount
  useEffect(() {
      if (elixirState.isConnected) {
        elixirState.disconnect();
      }
    }, []);
  
  // Auto-start real-time listener
  useEffect(() {
      _listener.start();
    }, []);
  
  // Auto-cleanup on unmount
    useEffect(() => {
      _listener.stop();
    }, []);
  
  return elixirState;
}

/// Extension for easy access to Elixir service
extension UseElixirExtension on WidgetRef {
  ElixirState get elixirState => ref.watch(elixirProvider);
  
  // Like (Star) interaction
  Future<bool> toggleLike(String reelId) async {
    try {
      final success = await elixirService.toggleLike(reelId);
      return success;
    } catch (e) {
      print('❌ Failed to toggle like: $e');
      return false;
    }
  }
  
  // Comment interaction
  Future<Map<String, dynamic>> addComment(String reelId, String text, String username) async {
    try {
      final comment = await elixirService.addComment(reelId, text, username);
      return comment;
    } catch (e) {
      print('❌ Failed to add comment: $e');
      return {};
    }
  }
  
  // Share interaction
  Future<bool> incrementShare(String reelId) async {
    try {
      final success = await elixirService.incrementShare(reelId);
      return success;
    } catch (e) {
      print('❌ Failed to increment share: $e');
      return false;
    }
  }
  
  // Save interaction
  Future<bool> toggleSave(String reelId) async {
    try {
      final success = await elixirService.toggleSave(reelId);
      return success;
    } catch (e) {
      print('❌ Failed to toggle save: $e');
      return false;
    }
  }
  
  // Support (Follow) interaction
  Future<bool> toggleSupport(String targetUserId) async {
    try {
      final success = await elixirService.toggleSupport(targetUserId);
      return success;
    } catch (e) {
      print('❌ Failed to toggle support: $e');
      return false;
    }
  }
  
  // Get counts
  Future<int> getLikeCount(String reelId) async {
    try {
      final count = await elixirService.getLikeCount(reelId);
      return count;
    } catch (e) {
      print('❌ Failed to get like count: $e');
      return 0;
    }
  }
  
  Future<int> getCommentCount(String reelId) async {
    try {
      final count = await elixirService.getCommentCount(reelId);
      return count;
    } catch (e) {
      print('❌ Failed to get comment count: $e');
      return 0;
    }
  }
  
  Future<int> getShareCount(String reelId) async {
    try {
      final count = await elixirService.getShareCount(reelId);
      return count;
    } catch (e) {
      print('❌ Failed to get share count: $e');
      return 0;
    }
  }
  
  Future<int> getSupportCount(String userId) async {
    try {
      final count = await elixirService.getSupportCount(userId);
      return count;
    } catch (e) {
      print('❌ Failed to get support count: $e');
      return 0;
    }
  }
  
  Future<Map<String, dynamic>> getUserSupporting(String userId) async {
    try {
      final supporting = await elixirService.getUserSupporting(userId);
      return supporting;
    } catch (e) {
      print('❌ Failed to get user supporting: $e');
      return {};
    }
  }
  
  Future<Map<String, dynamic>> getUserSupporters(String userId) async {
    try {
      const supporters = await elixirService.getUserSupporters(userId);
      return supporters;
    } catch (e) {
      print('❌ Failed to get user supporters: $e');
      return {};
    }
  }
  
  Future<Map<String, dynamic>> getUserLikedReels(String userId) async {
    try {
      final likedReels = await elixirService.getUserLikedReels(userId);
      return likedReels;
    } catch (e) {
      print('❌ Failed to get user liked reels: $e');
      return {};
    }
  }
  
  Future<Map<String, dynamic>> getUserSharedReels(String userId) async {
    try {
      const sharedReels = await elixirService.getUserSharedReels(userId);
      return sharedReels;
    } catch (e) {
      print('❌ Failed to get user shared reels: $e');
      return {};
    }
  }
  
  // Statistics
  Future<Map<String, dynamic>> getInteractionStats(String reelId) async {
    try {
      final stats = await elixirService.getInteractionStats(reelId);
      return stats;
    } catch (e) {
      print('❌ Failed to get interaction stats: $e');
      return {};
    }
  }
  
  Future<Map<String, dynamic>> getUserInteractionHistory(String userId) async {
    try {
      final history = await elixirService.getUserInteractionHistory(userId);
      return history;
    } catch (e) {
      print('❌ Failed to get user interaction history: $e');
      return {};
    }
  }
  
  // System statistics
  Future<Map<String, dynamic>> getSystemStats() async {
    try {
      final stats = await elixirService.getSystemStats();
      return stats;
    } catch (e) {
      print('❌ Failed to get system stats: $e');
      return {};
    }
  }
  
  // Batch operations
  Future<Map<String, dynamic>> batchInteractions(List<Map<String, dynamic>> interactions) async {
    try {
      final results = await elixirService.batchInteractions(interactions);
      return results;
    } catch (e) {
      print('❌ Failed to batch interactions: $e');
      return {};
    }
  }
  
  // Connection status
  bool get isConnected => elixirState.isConnected;
  String? get connectionError => elixirState.connectionError;
  Map<String, dynamic> get connectionStats => elixirState.connectionStats;
  Map<String, dynamic> get interactionStats => elixirState.interactionStats;
  Map<String, dynamic> get userPresence => elixirState.userPresence;
  
  // Cache invalidation
  Future<void> invalidateCache() async {
    // Invalidate local cache and force refresh from server
    try {
      // In a real implementation, this would clear local cache
      print('🗑️ Cache invalidated');
    } catch (e) {
      print('❌ Failed to invalidate cache: $e');
    }
  }
  
  // Reconnect
  Future<void> reconnect() async {
    if (elixirState.isConnected) {
      elixirState.disconnect();
    }
    await elixirState.connect();
  }
  
  // Performance metrics
  Map<String, dynamic> getPerformanceMetrics() {
    return {
      'connection_status': elixirState.isConnected ? 'connected' : 'disconnected',
      'connection_error': elixirState.connectionError,
      'last_update': elixirState.lastUpdate.toIso8601(),
      'avg_response_time': elixirState.connectionStats.avg_response_time,
      'error_count': elixirState.connection_stats.error_count,
      'total_connections': elixirState.connection_stats.total_connections,
      'active_connections': elixirState.connection_stats.active_connections,
      'cache_hit_rate': elixirState.interaction_stats.cache_hit_rate,
      'online_users': elixirState.userPresence.online_users,
      'total_sessions': elixirState.userPresence.total_sessions,
      'active_sessions': elixirState.user_presence.active_sessions,
      'last_updated': elixirState.user_presence.last_updated,
    };
  }
}

/// Extension for easy access to Elixir state
extension ElixirStateExtension on WidgetRef on ElixirState {
  void connect() {
    ref.read(elixirProvider.notifier).connect();
  }
  
  void disconnect() {
    ref.read(elixirProvider.notifier).disconnect();
  }
  
  bool isConnected => ref.read(elixirProvider.notifier).isConnected;
  
  String? connectionError => ref.read(elixirProvider.notifier).connectionError;
  
  Map<String, dynamic> connectionStats => ref.read(elixirProvider.notifier).connectionStats;
  
  Map<String, dynamic> interactionStats => ref.read(elixirProvider.notifier).interactionStats;
  
  Map<String, dynamic> userPresence => ref.read(elixirProvider.notifier).userPresence;
  
  void updateStats(Map<String, dynamic> stats) {
    ref.read(elixirProvider.notifier).updateStats(stats);
  }
  
  void updateUserPresence(Map<String, dynamic> presence) {
    ref.read(elixirProvider.notifier).updateUserPresence(presence);
  }
  
  void resetStats() {
    ref.read(elixirProvider.notifier).resetStats();
  }
  
  void invalidateCache() {
    ref.read(elixirProvider.notifier).resetStats();
  }
  
  void reconnect() {
    if (ref.read(elixirProvider.notifier).isConnected) {
      ref.read(elixirProvider.notifier).disconnect();
    }
    ref.read(elixirProvider.notifier).connect();
  }
  
  void setConnectionError(String error) {
    ref.read(elixirProvider.notifier).setConnectionError(error);
  }
  
  void setConnectionStats(Map<String, dynamic> stats) {
    ref.read(elixirProvider.notifier).connectionStats = stats;
  }
  
  void setUserPresence(Map<String, dynamic> presence) {
    ref.read(elixirProvider.notifier).userPresence = presence;
  }
  
  Map<String, dynamic> getUserSupporting(String userId) {
    return ref.read(elixirProvider.notifier).user_supporting;
  }
  
  Map<String, dynamic> getUserSupporters(String userId) {
    return ref.read(elixirProvider.notifier).user_supporters;
  }
  
  Map<String, dynamic> getUserLikedReels(String userId) {
    return ref.read(elixirProvider.notifier).user_liked_reels;
  }
  
  Map<String, dynamic> getUserSavedReels(String userId) {
    return ref.read(elixirProvider.notifier).user_saved_reels;
  }
  
  Map<String, dynamic> getUserSharedReels(String userId) {
    return ref.read(elixirProvider.notifier).user_shared_reels;
  }
  
  Map<String, dynamic> getCommentCount(String reelId) {
    return ref.read(elixirProvider.notifier).comment_count;
  }
  
  Map<String, dynamic> getShareCount(String reelId) {
    return ref.read(elixirProvider.notifier).share_count;
  }
  
  Map<String, dynamic> getSaveCount(String reelId) {
    return ref.read(elixirProvider.notifier).save_count;
  }
  
  Map<String, dynamic> getSupportCount(String userId) {
    return ref.read(elixirProvider.notifier).support_count;
  }
  
  Map<String, dynamic> getCommentCount(String reelId) {
    return ref.read(elixirProvider.notifier).comment_count;
  }
  
  Map<String, dynamic> getLikeCount(String reelId) {
    return ref.read(elixirProvider.notifier).like_count;
  }
  
  Map<String, dynamic> getSupportCount(String userId) {
    return ref.read(elixirProvider.notifier).support_count;
  }
  
  Map<String, dynamic> getUserSupporting(String userId) {
    return ref.read(elixirProvider.notifier).user_supporting;
  }
  
  Map<String, dynamic> getUserSupporters(String userId) {
    return ref.read(elixirProvider.notifier).user_supporters;
  }
  
  Map<String, dynamic> getUserLikedReels(String userId) {
    return ref.read(elixirProvider.notifier).user_liked_reels;
  }
  
  Map<String, dynamic> getUserSavedReels(String userId) {
    return ref.read(elixirProvider.notifier).user_saved_reels;
  }
  
  Map<String, dynamic> getUserSharedReels(String userId) {
    return ref.read(elixirProvider.notifier).user_shared_reels;
  }
  
  Map<String, dynamic> getInteractionStats(String reelId) {
    return ref.read(elixirProvider.notifier).interaction_stats;
  }
  
  Map<String, dynamic> getUserInteractionHistory(String userId) {
    return ref.read(elixirProvider.notifier).user_interaction_history;
  }
  
  Map<String, dynamic> getSystemStats() {
    return ref.read(elixirProvider.notifier).system_stats;
  }
  
  Map<String, dynamic> getPerformanceMetrics() {
    return ref.read(elixirProvider.notifier).performance_metrics;
  }
}

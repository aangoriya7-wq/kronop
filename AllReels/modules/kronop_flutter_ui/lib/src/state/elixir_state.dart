import 'package:flutter/foundation.dart';
import 'package:kronop_flutter_ui/src/services/phoenix_socket.dart';
import 'package:kronop_flutter_ui/src/services/elixir_service.dart';

/// Elixir state management using Riverpod
final elixirProvider = StateNotifier<ElixirState>((ref) => ElixirState(
  isConnected: false,
  connectionError: null,
  lastUpdate: DateTime.now(),
  connectionStats: {
    total_connections: 0,
    active_connections: 0,
    avg_response_time: 0.0,
    error_count: 0,
  },
  interactionStats: {
      total_interactions: 0,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      saves_count: 0,
      supports_count: 0,
      avg_response_time: 0.0,
      cache_hit_rate: 0.0,
    },
  userPresence: {
      online_users: 0,
      total_sessions: 0,
      active_sessions: 0,
      last_updated: DateTime.now(),
    },
));

/// Elixir state data class
@immutable
class ElixirState {
  final bool isConnected;
  final String? connectionError;
  final DateTime lastUpdate;
  final Map<String, dynamic> connectionStats;
  final Map<String, dynamic> interactionStats;
  final Map<String, dynamic> userPresence;
}

/// Elixir state notifier
class ElixirStateNotifier extends StateNotifier<ElixirState> {
  const ElixirStateNotifier() : super(ElixirState());
  
  void connect() {
    state = ElixirState(
      isConnected: true,
      connectionError: null,
      lastUpdate: DateTime.now(),
      connectionStats: {
        total_connections: state.connectionStats.total_connections + 1,
        active_connections: state.connectionStats.active_connections + 1,
        avg_response_time: state.connectionStats.avg_response_time,
        error_count: state.connectionStats.error_count,
      },
    );
  }
  
  void disconnect() {
    state = ElixirState(
      isConnected: false,
      connectionError: 'Disconnected',
      lastUpdate: DateTime.now(),
      connectionStats: {
        total_connections: state.connection_stats.total_connections,
        active_connections: state.connection_stats.active_connections - 1,
        avg_response_time: state.connection_stats.avg_response_time,
        error_count: state.connection_stats.error_count + 1,
      },
    );
  }
  
  void setConnectionError(String error) {
    state = ElixirState(
      isConnected: false,
      connectionError: error,
      lastUpdate: DateTime.now(),
      connectionStats: {
        total_connections: state.connection_stats.total_connections,
        active_connections: state.connection_stats.active_connections,
        avg_response_time: state.connection_stats.avg_response_time,
        error_count: state.connection_stats.error_count + 1,
      },
    );
  }
  
  void updateStats(Map<String, dynamic> stats) {
    state = ElixirState(
      isConnected: state.isConnected,
      connectionError: state.connectionError,
      lastUpdate: DateTime.now(),
      connectionStats: {
        total_connections: state.connection_stats.total_connections,
        active_connections: state.connection_stats.active_connections,
        avg_response_time: state.connection_stats.avg_response_time,
        error_count: state.connection_stats.error_count,
      },
      interactionStats: {
        total_interactions: stats['total_interactions'] ?? 0,
        likes_count: stats['likes_count'] ?? 0,
        comments_count: stats['comments_count'] ?? 0,
        shares_count: stats['shares_count'] ?? 0,
        saves_count: stats['saves_count'] ?? 0,
        supports_count: stats['supports_count'] ?? 0,
        avg_response_time: stats['avg_response_time'] ?? 0.0,
        cache_hit_rate: stats['cache_hit_rate'] ?? 0.0,
      },
      userPresence: {
        online_users: stats['online_users'] ?? 0,
        total_sessions: stats['total_sessions'] ?? 0,
        active_sessions: stats['active_sessions'] ?? 0,
        last_updated: stats['last_updated'] ?? DateTime.now(),
      },
    );
  }
  
  void updateUserPresence(Map<String, dynamic> presence) {
    state = ElixirState(
      isConnected: state.isConnected,
      connectionError: state.connectionError,
      lastUpdate: DateTime.now(),
      connectionStats: state.connectionStats,
      interactionStats: state.interactionStats,
      userPresence: {
        online_users: presence['online_users'] ?? 0,
        total_sessions: presence['total_sessions'] ?? 0,
        active_sessions: presence['active_sessions'] ?? 0,
        last_updated: presence['last_updated'] ?? DateTime.now(),
      },
    );
  }
  
  void updateInteractionStats(Map<String, dynamic> stats) {
    state = ElixirState(
      isConnected: state.isConnected,
      connectionError: state.connectionError,
      lastUpdate: DateTime.now(),
      connectionStats: state.connectionStats,
      interactionStats: {
        total_interactions: stats['total_interactions'] ?? 0,
        likes_count: stats['likes_count'] ?? 0,
        comments_count: stats['comments_count'] ?? 0,
        shares_count: stats['shares_count'] ?? 0,
        saves_count: stats['saves_count'] ?? 0,
        supports_count: stats['supports_count'] ?? 0,
        avg_response_time: stats['avg_response_time'] ?? 0.0,
        cache_hit_rate: stats['cache_hit_rate'] ?? 0.0,
      },
      userPresence: state.userPresence,
    );
  }
  
  void resetStats() {
    state = ElixirState(
      isConnected: false,
      connectionError: null,
      lastUpdate: DateTime.now(),
      connectionStats: {
        total_connections: 0,
        active_connections: 0,
        avg_response_time: 0.0,
        error_count: 0,
      },
      interactionStats: {
        total_interactions: 0,
        likes_count: 0,
        comments_count: 0,
        shares_count: 0,
        saves_count: 0,
        supports_count: 0,
        avg_response_time: 0.0,
        cache_hit_rate: 0.0,
      },
      userPresence: {
        online_users: 0,
        total_sessions: 0,
        active_sessions: 0,
        last_updated: DateTime.now(),
      },
    );
  }
}

/// Elixir provider for dependency injection
final elixirProvider = Provider<ElixirState>((ref) => ElixirState());
final elixirServiceProvider = Provider<ElixirState>((ref) => ElixirState());

/// Extension for easy access to Elixir state
extension ElixirStateExtension on WidgetRef {
  ElixirState get elixirState => ref.watch(elixirProvider);
  
  void connect() {
    ref.read(elixirProvider.notifier).connect();
  }
  
  void disconnect() {
    ref.read(elixirProvider.notifier).disconnect();
  }
  
  bool get isConnected => ref.read(elixirProvider.notifier).isConnected;
  
  String? get connectionError => ref.read(elixirProvider.notifier).connectionError;
  
  Map<String, dynamic> get connectionStats => ref.read(elixirProvider.notifier).connectionStats;
  
  Map<String, dynamic> get interactionStats => ref.read(elixirProvider.notifier).interactionStats;
  
  Map<String, dynamic> get userPresence => ref.read(elixirProvider.notifier).userPresence;
  
  void updateStats(Map<String, dynamic> stats) {
    ref.read(elixirProvider.notifier).updateStats(stats);
  }
  
  void updateUserPresence(Map<String, dynamic> presence) {
    ref.read(elixirProvider.notifier).updateUserPresence(presence);
  }
  
  void resetStats() {
    ref.read(elixirProvider.notifier).resetStats();
  }
}

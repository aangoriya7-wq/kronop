import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

/// Elixir service for real-time interaction updates
class ElixirService {
  static const String _baseUrl = 'http://localhost:4000/api/v1';
  
  /// Toggle like (star) interaction
  static Future<bool> toggleLike(String reelId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/toggle_like',
        {'reel_id': int.parse(reelId)},
      );
      
      return response['success'] == true;
    } catch (e) {
      print('Failed to toggle like: $e');
      return false;
    }
  }
  
  /// Get like count for a reel
  static Future<int> getLikeCount(String reelId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_like_count',
        {'reel_id': int.parse(reel_id)},
      );
      
      return response['like_count'] ?? 0;
    } catch (e) {
      print('Failed to get like count: $e');
      return 0;
    }
  }
  
  /// Toggle save interaction
  static Future<bool> toggleSave(String reelId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/toggle_save',
        {'reel_id': int.parse(reelId)},
      );
      
      return response['success'] == true;
    } catch (e) {
      print('Failed to toggle save: $e');
      return false;
    }
  }
  
  /// Get save count for a reel
  static Future<int> getSaveCount(String reelId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_save_count',
        {'reel_id': int.parse(reelId)},
      );
      
      return response['save_count'] ?? 0;
    } catch (e) {
      print('Failed to get save count: $e');
      return 0;
    }
  }
  
  /// Add comment
  static Future<Map<String, dynamic>> addComment(String reelId, String text, String username) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/add_comment',
        {
          'reel_id': int.parse(reelId),
          'text': text,
          'username': username,
        },
      );
      
      return response['comment'];
    } catch (e) {
      print('Failed to add comment: $e');
      return {};
    }
  }
  
  /// Get comments for a reel
  static Future<List<Map<String, dynamic>>> getComments(String reelId, {int limit = 50}) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_comments',
        {'reel_id': int.parse(reel_id), 'limit': limit},
      );
      
      return List<Map<String, dynamic>>. from(response['comments']);
    } catch (e) {
      print('Failed to get comments: $e');
      return [];
    }
  }
  
  /// Like a comment
  static Future<Map<String, dynamic>> likeComment(String commentId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/like_comment',
        {'comment_id': commentId},
      );
      
      return response['comment'];
    } catch (e) {
      print('Failed to like comment: $e');
      return {};
    }
  }
  
  /// Increment share count
  static Future<bool> incrementShare(String reelId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/increment_share',
        {'reel_id': int.parse(reel_id), 'platform': 'mobile'},
      );
      
      return response['success'] == true;
    } catch (e) {
      print('Failed to increment share: $e');
      return false;
    }
  }
  
  /// Get share count for a reel
  static Future<int> getShareCount(String reelId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_share_count',
        {'reel_id': int.parse(reel_id)},
      );
      
      return response['share_count'] ?? 0;
    } catch (e) {
      print('Failed to get share count: $e');
      return 0;
    }
  }
  
  /// Toggle support (follow) interaction
  static Future<bool> toggleSupport(String targetUserId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/toggle_support',
        {'target_user_id': targetUserId},
      );
      
      return response['success'] == true;
    } catch (e) {
      print('Failed to toggle support: $e');
      return false;
    }
  }
  
  /// Get support count for a user
  static Future<int> getSupportCount(String userId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_support_count',
        {'user_id': userId},
      );
      
      return response['support_count'] ?? 0;
    } catch (e) {
      print('Failed to get support count: $e');
      return 0;
    }
  }
  
  /// Get users that a user is supporting
  static Future<Map<String, dynamic>> getUserSupporting(String userId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_user_supporting',
        {'user_id': userId},
      );
      
      return Map<String, dynamic>.from(response['supporting']);
    } catch (e) {
      print('Failed to get user supporting: $e');
      return {};
    }
  }
  
  /// Get users that support a user
  static Future<Map<String, dynamic>> getUserSupporters(String userId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_user_supporters',
        {'user_id': userId},
      );
      
      return Map<String, dynamic>.from(response['supporters']);
    } catch (e) {
      print('Failed to get user supporters: $e');
      return {};
    }
  }
  
  /// Get user liked reels
  static Future<Map<String, dynamic>> getUserLikedReels(String userId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_user_liked_reels',
        {'user_id': userId},
      );
      
      return Map<String, dynamic>.from(response['liked_reels']);
    } catch (e) {
      print('Failed to get user liked reels: $e');
      return {};
    }
  }
  
  /// Get user shared reels
  static Future<Map<String, dynamic>> getUserSharedReels(String userId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_user_shared_reels',
        {'user_id': userId},
      );
      
      return Map<String, dynamic>.from(response['shared_reels']);
    } catch (e) {
      print('Failed to get user shared reels: $e');
      return {};
    }
  }
  
  /// Get interaction statistics for a reel
  static Future<Map<String, dynamic>> getInteractionStats(String reelId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_interaction_stats',
        {'reel_id': int.parse(reel_id)},
      );
      
      return Map<String, dynamic>.from(response['stats']);
    } catch (e) {
      print('Failed to get interaction stats: $e');
      return {};
    }
  }
  
  /// Get user interaction history
  static Future<Map<String, dynamic>> getUserInteractionHistory(String userId) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/get_user_interaction_history',
        {'user_id': userId},
      );
      
      return Map<String, dynamic>.from(response['history']);
    } catch (e) {
      print('Failed to get user interaction history: $e');
      return {};
    }
  }
  
  /// Get system statistics
  static Future<Map<String, dynamic>> getSystemStats() async {
    try {
      final response = await _makeRequest(
        'GET',
        '$_baseUrl/system/stats',
        {},
      );
      
      return Map<String, dynamic>.from(response);
    } catch (e) {
      print('Failed to get system stats: $e');
      return {};
    }
  }
  
  /// Batch interactions
  static Future<Map<String, dynamic>> batchInteractions(List<Map<String, dynamic>> interactions) async {
    try {
      final response = await _makeRequest(
        'POST',
        '$_baseUrl/interactions/batch_interactions',
        {'interactions': interactions},
      );
      
      return Map<String, dynamic>.from(response['results']);
    } catch (e) {
      print('Failed to batch interactions: $e');
      return {};
    }
  }
  
  /// Make HTTP request to Elixir backend
  static Future<Map<String, dynamic>> _makeRequest(String method, String endpoint, Map<String, dynamic> body) async {
    try {
      final uri = Uri.parse(endpoint);
      
      final request = http.Request(
        method: method,
        url: uri,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Kronop Flutter UI',
        },
        body: json.encode(body),
      );
      
      final response = await http.Response.fromRequest(request);
      
      if (response.statusCode == 200) {
        final responseBody = await response.stream.bytesToString();
        return json.decode(responseBody);
      } else {
        throw Exception('HTTP ${response.statusCode}: ${response.reasonPhrase}');
      }
    } catch (e) {
      print('HTTP request failed: $e');
      throw e;
    }
  }
}

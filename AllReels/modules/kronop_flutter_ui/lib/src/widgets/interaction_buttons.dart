import 'package:flutter/material.dart';
import 'package:flutter/services/phoenix_socket.dart';
import 'package:kronop_flutter_ui/src/services/elixir_service.dart';

/// Interaction buttons widget with real-time updates
class InteractionButtons extends StatefulWidget {
  final String reelId;
  final String username;
  final bool isStarred;
  final bool isSaved;
  final bool isSupporting;
  final int stars;
  final int comments;
  int shares;
  int saves;
  final int supporters;
  
  const InteractionButtons({
    required this.reelId,
    required this.username,
    this.isStarred = false,
    this.isSaved = false,
    this.isSupporting = false,
    this.stars = 0,
    this.comments = 0,
    this.shares = 0,
    this.saves = 0,
    this.supporters = 0,
  });
  
  @override
  _InteractionButtonsState createState() => _InteractionButtonsState();
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Like (Star) button
        _buildLikeButton(context),
        
        // Comment button
        _buildCommentButton(context),
        
        // Share button
        _buildShareButton(context),
        
        // Save button
        _buildSaveButton(context),
        
        // Support (Follow) button
        _buildSupportButton(context),
      ],
    );
  }
  
  Widget _buildLikeButton(BuildContext context) {
    return GestureDetector(
      onTap: () => _handleLike(context),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isStarred ? Colors.red : Colors.grey.withOpacity(0.3),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isStarred ? Colors.red : Colors.grey.withOpacity(0.5),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isStarred ? Icons.star : Icons.star_border,
              color: isStarred ? Colors.red : Colors.grey,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              '$stars',
              style: TextStyle(
                color: isStarred ? Colors.red : Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildCommentButton(BuildContext context) {
    return GestureDetector(
      onTap: () => _handleComment(context),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.blue.withOpacity(0.3),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Colors.blue.withOpacity(0.5),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.comment,
              color: Colors.blue,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              '$comments',
              style: TextStyle(
                color: Colors.blue,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildShareButton(BuildContext context) {
    return GestureDetector(
      onTap: () => _handleShare(context),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.green.withOpacity(0.3),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Colors.green.withOpacity(0.5),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.share,
              color: Colors.green,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              '$shares',
              style: TextStyle(
                color: Colors.green,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildSaveButton(BuildContext context) {
    return GestureDetector(
      onTap: () => _handleSave(context),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.3),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Colors.orange.withOpacity(0.5),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.bookmark,
              color: isSaved ? Colors.orange : Colors.grey,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              '$saves',
              style: TextStyle(
                color: isSaved ? Colors.orange : Colors.grey,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildSupportButton(BuildContext context) {
    return GestureDetector(
      onTap: () => _handleSupport(context),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.purple.withOpacity(0.3),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Colors.purple.withOpacity(0.5),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.person_add,
              color: isSupporting ? Colors.purple : Colors.grey,
              size: 20,
            ),
            const SizedBox(width: 8),
            Text(
              '$supporters}',
              style: TextStyle(
                color: isSupporting ? Colors.purple : Colors.grey,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  // Event handlers
  Future<void> _handleLike(BuildContext context) async {
    try {
      final isLiked = await ElixirService.toggleLike(reelId);
      
      if (isLiked) {
        // Show success feedback
        ScaffoldMessenger.of(context).showSnackBar(
          content: '❤️ Liked!',
          duration: Duration(seconds: 1),
          backgroundColor: Colors.red,
        );
      } else {
        // Show unliked feedback
        ScaffoldMessenger.of(context).showSnackBar(
          content: '👎 Unliked',
          duration: Duration(seconds: 1),
          backgroundColor: Colors.grey,
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        content: '❌ Failed to like: $e',
        duration: Duration(seconds: 2),
        backgroundColor: Colors.red,
      );
    }
  }
  
  Future<void> _handleComment(BuildContext context) async {
    try {
      // Show comment modal
      await _showCommentModal(context);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        content: '❌ Failed to open comment modal: $e',
        duration: Duration(seconds: 2),
        backgroundColor: Colors.red,
      );
    }
  }
  
  Future<void> _handleShare(BuildContext context) async {
    try {
      final shared = await ElixirService.incrementShare(reelId);
      
      if (shared) {
        // Show success feedback
        ScaffoldMessenger.of(context).showSnackBar(
          content: '🚀 Shared successfully!',
          duration: Duration(seconds: 1),
          backgroundColor: Colors.green,
        );
      } else {
        // Show error feedback
        ScaffoldMessenger.of(context).showSnackBar(
          content: '❌ Failed to share',
          duration: Duration(seconds: 2),
          backgroundColor: Colors.red,
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        content: '❌ Failed to share: $e',
        duration: Duration(seconds: 2),
        backgroundColor: Colors.red,
      );
    }
  }
  
  Future<void> _handleSave(BuildContext context) async {
    try {
      final isSaved = await ElixirService.toggleSave(reelId);
      
      if (isSaved) {
        // Show success feedback
        ScaffoldMessenger.of(context).showSnackBar(
          content: '📚 Saved to collection!',
          duration: Duration(seconds: 1),
          backgroundColor: Colors.orange,
        );
      } else {
        // Show unliked feedback
        ScaffoldMessenger.of(context).showSnackBar(
          content: '🗑 Removed from collection',
          duration: Duration(seconds: 1),
          backgroundColor: Colors.grey,
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        content: '❌ Failed to save: $e',
        duration: Duration(seconds: 2),
        backgroundColor: Colors.red,
      );
    }
  }
  
  Future<void> _handleSupport(BuildContext context) async {
    try {
      final isSupporting = await ElixirService.toggleSupport(username);
      
      if (isSupporting) {
        // Show success feedback
        ScaffoldMessenger.of(context).showSnackBar(
          content: '👥 Following $username!',
          duration: Duration(seconds: 1),
          backgroundColor: Colors.purple,
        );
      } else {
        // Show unfollow feedback
        ScaffoldMessenger.of(context).showSnackBar(
          content: '👤 Unfollowed $username',
          duration: Duration(seconds: 1),
          backgroundColor: Colors.grey,
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        content: '❌ Failed to support: $e',
        duration: Duration(seconds: 2),
        backgroundColor: Colors.red,
      );
    }
  }
  
  Future<void> _showCommentModal(BuildContext context) async {
    // Show comment modal dialog
    return showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: 'Add Comment',
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                decoration: const InputDecoration(
                  hintText: 'Write your comment...',
                  border: OutlineInputBorder(),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Colors.blue),
                  fillColor: Colors.white,
                  filled: true,
                ),
                ),
                const SizedBox(height: 100),
                TextField(
                  decoration: const InputDecoration(
                    hintText: 'Add a reply...',
                    border: OutlineInputBorder(),
                    focusedBorder: OutlineInputBorder(
                      borderSide: BorderSide(color: Colors.blue),
                      fillColor: Colors.white,
                      filled: true,
                    ),
                ),
              ],
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text('Cancel'),
                  ),
                  const SizedBox(width: 16),
                  TextButton(
                    onPressed: () {
                      // Add comment logic here
                      Navigator.of(context).pop();
                    },
                    child: Text('Post'),
                    style: TextStyle(
                      color: Colors.blue,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

/// Real-time interaction listener
class RealtimeInteractionListener {
  static RealtimeInteractionListener? _instance;
  
  static RealtimeInteractionListener getInstance() {
    _instance ??= RealtimeInteractionListener._();
    return _instance;
  }
  
  RealtimeInteractionListener._();
  
  /// Start listening for real-time updates
  Future<void> start() async {
    await _instance.start();
  }
  
  /// Stop listening
  void stop() {
    _instance.stop();
  }
  
  /// Listen for like updates
  void onLikeUpdate(Function(Map<String, dynamic>) onLikeUpdate {
    _instance.onInteractionUpdate('like_update', onLikeUpdate);
  }
  
  /// Listen for comment updates
  void onCommentUpdate(Function(Map<String, dynamic>) onCommentUpdate {
    _instance.onInteractionUpdate('comment_update', onCommentUpdate);
  }
  
  /// Listen for share updates
  void onShareUpdate(Function(Map<String, dynamic>) onShareUpdate {
    _instance.onInteractionUpdate('share_update', onShareUpdate);
  }
  
  /// Listen for save updates
  void onSaveUpdate(Function(Map<String, dynamic>) onSaveUpdate {
    _instance.onInteractionUpdate('save_update', onSaveUpdate);
  }
  
  /// Listen for support updates
  void onSupportUpdate(Function(Map<String, dynamic>) onSupportUpdate {
    _instance.onInteractionUpdate('support_update', onSupportUpdate);
  }
  
  /// Listen for user updates
  void onUserUpdate(Function(Map<String, dynamic>) onUserUpdate {
    _instance.onUserUpdate('user_update', onUserUpdate);
  }
  
  /// Listen for reel updates
  void onReelUpdate(Function(Map<String, dynamic>) onReelUpdate {
    _instance.onReelUpdate('reel_update', onReelUpdate);
  }
}

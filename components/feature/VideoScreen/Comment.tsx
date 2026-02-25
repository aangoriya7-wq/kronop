import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, Modal, View, TextInput, ScrollView, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface CommentProps {
  onPress: () => void;
  count?: number;
  videoId?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Comment({ onPress, count = 0, videoId }: CommentProps) {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState([
    { id: 1, user: 'User1', text: 'Great video!', time: '2h ago' },
    { id: 2, user: 'User2', text: 'Amazing content', time: '5h ago' },
  ]);

  const handleCommentPress = () => {
    setShowComments(true);
    onPress();
  };

  const handleSendComment = () => {
    if (newComment.trim()) {
      const comment = {
        id: comments.length + 1,
        user: 'You',
        text: newComment,
        time: 'now'
      };
      setComments([comment, ...comments]);
      setNewComment('');
    }
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={handleCommentPress}
        activeOpacity={0.7}
      >
        <MaterialIcons name="comment" size={24} color="#FFFFFF" />
        <Text style={styles.commentCount}>{count}</Text>
      </TouchableOpacity>

      <Modal
        visible={showComments}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowComments(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.commentSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments ({comments.length})</Text>
              <TouchableOpacity onPress={() => setShowComments(false)}>
                <MaterialIcons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Text style={styles.commentUser}>{comment.user}</Text>
                  <Text style={styles.commentText}>{comment.text}</Text>
                  <Text style={styles.commentTime}>{comment.time}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add a comment..."
                placeholderTextColor="#888"
                multiline
              />
              <TouchableOpacity onPress={handleSendComment} style={styles.sendButton}>
                <MaterialIcons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  commentCount: {
    fontSize: 10,
    color: '#FFFFFF',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  commentSheet: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  commentsList: {
    flex: 1,
    padding: theme.spacing.md,
  },
  commentItem: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 12,
    color: '#888',
  },
  commentInputContainer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

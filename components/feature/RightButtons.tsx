import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { InteractionBar } from './InteractionBar';

interface RightButtonsProps {
  itemId: string;
  likes: number;
  commentsCount: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  onLikePress: (id: string, nextLiked: boolean) => void;
  onCommentPress: (id: string) => void;
  onSharePress: (id: string) => void;
  onSavePress: (id: string, nextSaved: boolean) => void;
  onReportPress?: (id: string) => void;
}

export default function RightButtons(props: RightButtonsProps) {
  const {
    itemId,
    likes,
    commentsCount,
    shares,
    isLiked,
    isSaved,
    onLikePress,
    onCommentPress,
    onSharePress,
    onSavePress,
    onReportPress,
  } = props;

  return (
    <View style={styles.container}>
      <InteractionBar
        itemId={itemId}
        likes={likes}
        comments={Array.from({ length: commentsCount })}
        shares={shares}
        isLiked={isLiked}
        isSaved={isSaved}
        onLikeChange={(id, nextLiked, count) => onLikePress(id, nextLiked)}
        onCommentPress={(id) => onCommentPress(id)}
        onShareChange={(id, count) => onSharePress(id)}
        onSaveChange={(id, nextSaved) => onSavePress(id, nextSaved)}
        size="medium"
        showCounts={true}
      />

      {onReportPress && (
        <View style={styles.reportWrap}>
          <TouchableOpacity style={styles.reportButton} onPress={() => onReportPress(itemId)} activeOpacity={0.7}>
            <MaterialIcons name="flag" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 8,
    bottom: 100,
    alignItems: 'center',
    zIndex: 10,
  },
  reportWrap: {
    marginTop: 4, // Reduced from 8 to 4 to bring report button closer to interaction buttons
    alignItems: 'center',
  },
  reportButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});


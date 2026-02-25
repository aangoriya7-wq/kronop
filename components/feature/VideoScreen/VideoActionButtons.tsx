import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../../constants/theme';

interface VideoActionButtonsProps {
  isStarred: boolean;
  commentsCount: number;
  sharesCount: number;
  isSaved: boolean;
  onStarPress: () => void;
  onCommentPress: () => void;
  onSharePress: () => void;
  onSavePress: () => void;
  onReportPress: () => void;
  onDownloadPress: () => void;
}

export default function VideoActionButtons({
  isStarred,
  commentsCount,
  sharesCount,
  isSaved,
  onStarPress,
  onCommentPress,
  onSharePress,
  onSavePress,
  onReportPress,
  onDownloadPress,
}: VideoActionButtonsProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={onStarPress} activeOpacity={0.7}>
        <MaterialIcons 
          name={isStarred ? 'star' : 'star-border'} 
          size={24} 
          color={isStarred ? theme.colors.primary.main : theme.colors.text.primary} 
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onCommentPress} activeOpacity={0.7}>
        <MaterialIcons name="comment" size={24} color={theme.colors.text.primary} />
        {commentsCount > 0 && (
          <Text style={styles.count}>{formatNumber(commentsCount)}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onSharePress} activeOpacity={0.7}>
        <MaterialIcons name="share" size={24} color={theme.colors.text.primary} />
        {sharesCount > 0 && (
          <Text style={styles.count}>{formatNumber(sharesCount)}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onSavePress} activeOpacity={0.7}>
        <MaterialIcons 
          name={isSaved ? 'bookmark' : 'bookmark-border'} 
          size={24} 
          color={isSaved ? theme.colors.primary.main : theme.colors.text.primary} 
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onReportPress} activeOpacity={0.7}>
        <MaterialIcons name="flag" size={24} color={theme.colors.text.primary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={onDownloadPress} activeOpacity={0.7}>
        <MaterialIcons name="download" size={24} color={theme.colors.text.primary} />
      </TouchableOpacity>
    </View>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  count: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
});

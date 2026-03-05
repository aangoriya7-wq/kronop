import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import ChannelLogo from './ChannelLogo';
import ChannelName from './ChannelName';
import VideoTitle from './VideoTitle';
import SupportButton from './SupportButton';

interface ChannelInfoProps {
  channelLogo: string;
  channelName: string;
  videoTitle: string;
  isVerified?: boolean;
  isSupported?: boolean;
  onChannelPress: () => void;
  onSupportPress: () => void;
}

const ChannelInfo: React.FC<ChannelInfoProps> = ({
  channelLogo,
  channelName,
  videoTitle,
  isVerified = false,
  isSupported = false,
  onChannelPress,
  onSupportPress,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.channelInfo} onPress={onChannelPress}>
        <ChannelLogo source={channelLogo} size={40} />
        <View style={styles.textContainer}>
          <ChannelName name={channelName} isVerified={isVerified} />
        </View>
        <SupportButton 
          onPress={onSupportPress} 
          isActive={isSupported}
          size="small"
        />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <VideoTitle title={videoTitle} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 80,
    bottom: 80, // Moved down from 120px to 80px
    flexDirection: 'column',
    justifyContent: 'flex-end',
    zIndex: 10, // Ensure text appears above video
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // Reduced from 6
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  titleContainer: {
    marginLeft: 52, // Align with channel name text
    marginBottom: 8, // Reduced bottom margin for cleaner look
  },
});

export default ChannelInfo;

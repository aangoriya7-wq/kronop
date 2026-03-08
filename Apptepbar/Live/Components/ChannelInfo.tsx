import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ChannelLogo from './ChannelLogo';
import ChannelName from './ChannelName';
import VideoTitle from './VideoTitle';
import SupportButton from './SupportButton';

interface ChannelInfoProps {
  videoId: string;
  channelLogo: string;
  channelName: string;
  videoTitle: string;
  isVerified?: boolean;
  initiallySupported?: boolean;
}

const ChannelInfo: React.FC<ChannelInfoProps> = ({
  videoId,
  channelLogo,
  channelName,
  videoTitle,
  isVerified = false,
  initiallySupported = false,
}) => {
  const router = useRouter();

  const handleChannelPress = () => {
    // Navigate to channel profile
    router.push(`/channel/${channelName}` as any);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.channelInfo} onPress={handleChannelPress}>
        <ChannelLogo source={channelLogo} size={40} />
        <View style={styles.textContainer}>
          <ChannelName name={channelName} isVerified={isVerified} />
        </View>
        <SupportButton 
          channelName={channelName}
          initiallySupported={initiallySupported}
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
    bottom: 80,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  titleContainer: {
    marginLeft: 52,
    marginBottom: 8,
  },
});

export default ChannelInfo;

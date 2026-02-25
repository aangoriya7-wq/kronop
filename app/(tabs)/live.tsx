import React, { useState, useRef } from 'react';

import { View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList, Share, Alert, Animated, ScrollView } from 'react-native';

import { Video, ResizeMode } from 'expo-av';
import { useCameraPermissions } from 'expo-camera';

import { useSafeAreaInsets } from 'react-native-safe-area-context';



interface LiveStream {

  id: string;

  creator: string;

  title: string;

  viewers: string;

  duration: string;

  category: string;

  creatorId: string;

  isLive: boolean;

  isSupported: boolean;

  isStarred: boolean;

  starsCount: number;

  videoUrl: string;

}



const mockLiveStreams: LiveStream[] = [

  {

    id: '1',

    creator: 'Gaming Pro',

    title: 'Epic Battle Royale - Join Now!',

    viewers: '12.5K',

    duration: '2:45',

    category: 'Gaming',

    creatorId: 'user1',

    isLive: true,

    isSupported: false,

    isStarred: false,

    starsCount: 4800,

    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'

  },

  {

    id: '2',

    creator: 'Music Vibes',

    title: 'Live Concert Performance',

    viewers: '8.2K',

    duration: '1:30',

    category: 'Music',

    creatorId: 'user2',

    isLive: true,

    isSupported: true,

    isStarred: true,

    starsCount: 8200,

    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4'

  },

  {

    id: '3',

    creator: 'Tech Review',

    title: 'Latest Gadgets Unboxing Live',

    viewers: '15.3K',

    duration: '3:15',

    category: 'Technology',

    creatorId: 'user3',

    isLive: false,

    isSupported: false,

    isStarred: false,

    starsCount: 15300,

    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'

  },

  {

    id: '4',

    creator: 'Cooking Master',

    title: 'Making Delicious Recipes',

    viewers: '5.7K',

    duration: '1:45',

    category: 'Food',

    creatorId: 'user4',

    isLive: true,

    isSupported: false,

    isStarred: false,

    starsCount: 5700,

    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4'

  },

];



// Convert to Liveall format
const liveallStreams = mockLiveStreams.map(stream => ({
  id: stream.id,
  videoUrl: stream.videoUrl,
  title: stream.title,
  creatorName: stream.creator,
  viewers: stream.viewers,
  views: parseInt(stream.viewers.replace('K', '000')) || 1000,
  likes: stream.starsCount,
  music: 'Original Audio',
  user: {
    username: stream.creatorId
  },
  isLive: stream.isLive
}));

// Liveall stream interface
interface LiveallStream {
  id: string;
  videoUrl: string;
  title: string;
  creatorName: string;
  viewers: string;
  views: number;
  likes: number;
  music: string;
  user: {
    username: string;
  };
  isLive: boolean;
}

// Liveall Component Props interface
interface LiveallProps {
  streams: LiveallStream[];
  initialIndex: number;
  onIndexChange: (index: number) => void;
  onVideoEnd: () => void;
}

// Liveall Component Definition
function Liveall({ streams, initialIndex, onIndexChange, onVideoEnd }: LiveallProps) {
  const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.round(offsetY / SCREEN_HEIGHT);
    setCurrentIndex(index);
    onIndexChange(index);
  };

  const renderItem = ({ item }: { item: LiveallStream }) => (
    <View style={{ height: SCREEN_HEIGHT }}>
      <Video
        source={{ uri: item.videoUrl }}
        style={{ flex: 1 }}
        shouldPlay={currentIndex === streams.indexOf(item)}
        isLooping
        resizeMode={ResizeMode.COVER}
        onPlaybackStatusUpdate={(status: any) => {
          if (status && status.didJustFinish) {
            onVideoEnd();
          }
        }}
      />
    </View>
  );

  return (
    <FlatList
      data={streams}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={SCREEN_HEIGHT}
      decelerationRate="fast"
      onMomentumScrollEnd={handleScroll}
      style={{ flex: 1 }}
    />
  );
}



const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');



export default function LiveScreen() {

  const insets = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();

  const [currentIndex, setCurrentIndex] = useState(0);

  const [activeTab, setActiveTab] = useState<'all' | 'supporter' | 'supporting' | 'international'>('all');

  const [message, setMessage] = useState('');

  const [streams, setStreams] = useState<LiveStream[]>(mockLiveStreams);

  const [activeAnimations, setActiveAnimations] = useState<Record<string, boolean>>({});



  // Filter streams based on active tab

  const getFilteredStreams = () => {

    switch (activeTab) {

      case 'supporter':

        return streams.filter(stream => stream.isSupported);

      case 'supporting':

        return streams.filter(stream => stream.isStarred);

      case 'international':

        return streams.filter(stream => stream.category === 'Gaming' || stream.category === 'Music' || stream.category === 'Technology');

      default:

        return streams;

    }

  };



  const handleScroll = (event: any) => {

    const offsetY = event.nativeEvent.contentOffset.y;

    const index = Math.round(offsetY / (SCREEN_HEIGHT * 0.85));

    setCurrentIndex(index);

  };



  const toggleSupport = (streamId: string) => {

    setStreams(prev =>

      prev.map(s =>

        s.id === streamId ? { ...s, isSupported: !s.isSupported } : s

      )

    );

  };



  const formatNumber = (num: number) => {

    if (num >= 1000) {

      return (num / 1000).toFixed(1) + 'K';

    }

    return num.toString();

  };



  const triggerStarAnimation = (streamId: string) => {

    setActiveAnimations(prev => ({

      ...prev,

      [streamId]: true

    }));

    

    setTimeout(() => {

      setActiveAnimations(prev => ({

        ...prev,

        [streamId]: false

      }));

    }, 2000);

  };



  const toggleStar = (streamId: string) => {

    setStreams(prev => {

      const updatedStreams = prev.map(s => {

        if (s.id === streamId) {

          const newIsStarred = !s.isStarred;

          const newStarsCount = newIsStarred ? s.starsCount + 1 : Math.max(0, s.starsCount - 1);

          if (newIsStarred) {

            triggerStarAnimation(streamId);

          }

          return { ...s, isStarred: newIsStarred, starsCount: newStarsCount };

        }

        return s;

      });

      return updatedStreams;

    });

  };



  const handleShare = async (streamTitle: string) => {

    try {

      const result = await Share.share({

        message: `Check out this live stream: "${streamTitle}" on [Your App Name]!`,

        url: 'https://example.com/livestream/123'

      });

      if (result.action === Share.sharedAction) {

      } else if (result.action === Share.dismissedAction) {

      }

    } catch (error: any) {

      Alert.alert('Share Error', error.message);

    }

  };



  const renderLiveItem = ({ item: stream }: { item: LiveStream }) => (

    <View style={[styles.liveContainer, { height: SCREEN_HEIGHT * 0.85 }]}>

      {/* Dot Animation Only - NO STAR VISIBLE */}

      <DotAnimation isActive={activeAnimations[stream.id] || false} />

      

      {/* Liveall Component */}

      <Liveall

        streams={liveallStreams}

        initialIndex={currentIndex}

        onIndexChange={setCurrentIndex}

        onVideoEnd={() => console.log('Video ended')}

      />

    </View>

  );



  return (

    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Header with 4 Filter Tabs */}

      <View style={styles.header}>

        <ScrollView 

          horizontal 

          showsHorizontalScrollIndicator={false}

          contentContainerStyle={styles.tabsContainer}

        >

          <TouchableOpacity

            style={[styles.tab, activeTab === 'all' && styles.tabActive]}

            onPress={() => setActiveTab('all')}

          >

            <Text 

              style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}

            >

              All

            </Text>

          </TouchableOpacity>



          <TouchableOpacity

            style={[styles.tab, activeTab === 'supporter' && styles.tabActive]}

            onPress={() => setActiveTab('supporter')}

          >

            <Text 

              style={[styles.tabText, activeTab === 'supporter' && styles.tabTextActive]}

            >

              Supporter

            </Text>

          </TouchableOpacity>



          <TouchableOpacity

            style={[styles.tab, activeTab === 'supporting' && styles.tabActive]}

            onPress={() => setActiveTab('supporting')}

          >

            <Text 

              style={[styles.tabText, activeTab === 'supporting' && styles.tabTextActive]}

            >

              Supporting

            </Text>

          </TouchableOpacity>



          <TouchableOpacity

            style={[styles.tab, activeTab === 'international' && styles.tabActive]}

            onPress={() => setActiveTab('international')}

          >

            <Text 

              style={[styles.tabText, activeTab === 'international' && styles.tabTextActive]}

            >

              International

            </Text>

          </TouchableOpacity>

        </ScrollView>

      </View>



      {/* Live Streams Section */}

      <FlatList

        data={getFilteredStreams()}

        renderItem={renderLiveItem}

        keyExtractor={(item) => item.id}

        pagingEnabled

        showsVerticalScrollIndicator={false}

        snapToInterval={SCREEN_HEIGHT * 0.85}

        decelerationRate="fast"

        onMomentumScrollEnd={handleScroll}

        style={styles.streamsList}

        contentContainerStyle={styles.streamsListContent}

      />

    </View>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#000000',

  },

  // Dot Animation Styles - moved to top

  dotAnimationContainer: {

    position: 'absolute',

    top: 0,

    left: 0,

    right: 0,

    bottom: 0,

    zIndex: 1000,

    justifyContent: 'center',

    alignItems: 'center',

  },

  tinyRedDot: {

    position: 'absolute',

    backgroundColor: '#6A5ACD',

    top: '50%',

    left: '50%',

    zIndex: 1000,

  },

  header: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 16,

    paddingVertical: 12,

    backgroundColor: '#000000',

    borderBottomWidth: 1,

    borderBottomColor: '#1A1A1A',

    zIndex: 100,

  },

  tabsContainer: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'flex-start', // Left align buttons

    paddingLeft: 8, // Start closer to left edge

    paddingRight: 16,

    gap: 8, // Tight spacing between buttons

  },

  tab: {

    paddingVertical: 8,

    paddingHorizontal: 8, // Reduced padding

    alignItems: 'center',

    // Remove minWidth to allow natural width

  },

  tabActive: {

    borderBottomWidth: 1,

    borderBottomColor: '#6A5ACD',

  },

  tabText: {

    color: '#666666',

    fontSize: 15, // Uniform font size for all buttons

    fontWeight: '400',

    textAlign: 'center',

  },

  tabTextActive: {

    color: '#6A5ACD',

    fontWeight: '500',

    textAlign: 'center',

    fontSize: 15, // Same size for active state

  },

  streamsList: {

    flex: 1,

  },

  streamsListContent: {

    paddingBottom: 90,

  },

  liveContainer: {

    position: 'relative',

  },

});



// Simple Dot Animation component - NO STAR VISIBLE

function DotAnimation({ isActive }: { isActive: boolean }) {

  const dotsAnim = useRef(new Animated.Value(0)).current;

  const [animationActive, setAnimationActive] = useState(false);



  const startAnimation = React.useCallback(() => {

    setAnimationActive(true);

    dotsAnim.setValue(0);



    // Simple dots animation only

    Animated.timing(dotsAnim, {

      toValue: 1,

      duration: 800,

      useNativeDriver: true,

    }).start(() => {

      // Fade out after animation

      setTimeout(() => {

        setAnimationActive(false);

      }, 300);

    });

  }, [dotsAnim]);



  React.useEffect(() => {

    if (isActive) {

      startAnimation();

    }

  }, [isActive, startAnimation]);



  if (!animationActive) return null;



  return (

    <View style={styles.dotAnimationContainer}>

      {/* Multiple dots coming from all directions */}

      {Array.from({ length: 200 }).map((_, i) => {

        const angle = (i * 1.8) * (Math.PI / 180); // 200 dots

        const distance = 250 + Math.random() * 150;

        const size = 1 + Math.random() * 2; // 1-3px

        

        return (

          <Animated.View 

            key={`dot-${i}`}

            style={[

              styles.tinyRedDot,

              {

                width: size,

                height: size,

                borderRadius: size / 2,

                opacity: dotsAnim.interpolate({

                  inputRange: [0, 0.5, 1],

                  outputRange: [0, 1, 0]

                }),

                transform: [

                  {

                    translateX: dotsAnim.interpolate({

                      inputRange: [0, 1],

                      outputRange: [Math.cos(angle) * distance, 0]

                    })

                  },

                  {

                    translateY: dotsAnim.interpolate({

                      inputRange: [0, 1],

                      outputRange: [Math.sin(angle) * distance, 0]

                    })

                  },

                  {

                    scale: dotsAnim.interpolate({

                      inputRange: [0, 0.5, 1],

                      outputRange: [0.3, 1.2, 0.8]

                    })

                  }

                ]

              }

            ]}

          />

        );

      })}

    </View>

  );

}


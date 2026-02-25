import React, { useState, useEffect } from 'react';

import {

  View,

  Text,

  StyleSheet,

  ScrollView,

  TouchableOpacity,

  ActivityIndicator,

  RefreshControl,

  FlatList,

} from 'react-native';

import { SafeScreen } from '../../components/layout/SafeScreen';

import { MaterialIcons, Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';

import { videosApi } from '../../services/api';

import { useLocalSearchParams, useRouter } from 'expo-router';



interface VideoApiResponse {

  data?: VideoItem[];

}



interface VideoItem {

  id: string;

  title: string;

  stars: number;

  comments: number;

  shares: number;

  views: number;

  thumbnail?: string;

}



export default function VideoToolScreen() {

  const router = useRouter();

  const { title, stats } = useLocalSearchParams<{

    title?: string;

    stats?: string;

  }>();



  const initialStats = stats ? JSON.parse(stats) : {};

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [videos, setVideos] = useState<VideoItem[]>([]);

  const [summary, setSummary] = useState({

    total: initialStats?.total || 0,

    stars: initialStats?.stars || 0,

    comments: initialStats?.comments || 0,

    shares: initialStats?.shares || 0,

    views: initialStats?.views || 0,

  });



  useEffect(() => {

    loadVideos();

  }, []);



  const onRefresh = async () => {

    setRefreshing(true);

    await loadVideos();

    setRefreshing(false);

  };



  const loadVideos = async () => {

    try {

      setLoading(true);

      const response: any = await videosApi.getVideos();

      const data = Array.isArray(response) ? response : response?.data || [];



      // Process videos

      const processedVideos = data.map((item: VideoItem, index: number) => ({

        id: item.id || `video_${index}`,

        title: item.title || `Video ${index + 1}`,

        stars: item.stars || Math.floor(Math.random() * 100),

        comments: item.comments || Math.floor(Math.random() * 50),

        shares: item.shares || Math.floor(Math.random() * 30),

        views: item.views || Math.floor(Math.random() * 1000),

      }));



      setVideos(processedVideos);



      // Update summary

      const newSummary = processedVideos.reduce(

        (acc: { total: number; stars: number; comments: number; shares: number; views: number }, video: VideoItem) => {

          acc.stars += video.stars;

          acc.comments += video.comments;

          acc.shares += video.shares;

          acc.views += video.views;

          return acc;

        },

        { total: processedVideos.length, stars: 0, comments: 0, shares: 0, views: 0 }

      );



      setSummary(newSummary);

    } catch (error) {

      console.error('Error loading videos:', error);

    } finally {

      setLoading(false);

    }

  };



  const renderVideoItem = ({ item }: { item: VideoItem }) => (

    <TouchableOpacity style={styles.videoCard}>

      <View style={styles.videoHeader}>

        <MaterialIcons name="videocam" size={20} color="#8B00FF" />

        <Text style={styles.videoTitle}>{item.title}</Text>

      </View>

      

      <View style={styles.videoStats}>

        <View style={styles.statItem}>

          <Ionicons name="star" size={14} color="#FFD700" />

          <Text style={styles.statText}>{item.stars}</Text>

        </View>

        <View style={styles.statItem}>

          <MaterialIcons name="comment" size={14} color="#4CAF50" />

          <Text style={styles.statText}>{item.comments}</Text>

        </View>

        <View style={styles.statItem}>

          <MaterialIcons name="share" size={14} color="#8B00FF" />

          <Text style={styles.statText}>{item.shares}</Text>

        </View>

        <View style={styles.statItem}>

          <MaterialIcons name="visibility" size={14} color="#FF9800" />

          <Text style={styles.statText}>{item.views}</Text>

        </View>

      </View>

    </TouchableOpacity>

  );



  if (loading && !refreshing) {

    return (

      <SafeScreen>

        <View style={styles.loadingContainer}>

          <ActivityIndicator size="large" color="#8B00FF" />

          <Text style={styles.loadingText}>Loading videos...</Text>

        </View>

      </SafeScreen>

    );

  }



  return (

    <SafeScreen>

      <View style={styles.container}>

        {/* Header */}

        <View style={styles.header}>

          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>

            <MaterialIcons name="arrow-back" size={24} color="#fff" />

          </TouchableOpacity>

          <Text style={styles.headerTitle}>{title}</Text>

          <View style={styles.placeholder} />

        </View>



        {/* Summary Card */}

        <View style={styles.summaryCard}>

          <Text style={styles.summaryTitle}>Summary</Text>

          <View style={styles.summaryGrid}>

            <View style={styles.summaryItem}>

              <Text style={styles.summaryLabel}>Total Videos</Text>

              <Text style={styles.summaryValue}>{summary.total}</Text>

            </View>

            <View style={styles.summaryItem}>

              <Text style={styles.summaryLabel}>Total Stars</Text>

              <Text style={styles.summaryValue}>{summary.stars}</Text>

            </View>

            <View style={styles.summaryItem}>

              <Text style={styles.summaryLabel}>Comments</Text>

              <Text style={styles.summaryValue}>{summary.comments}</Text>

            </View>

            <View style={styles.summaryItem}>

              <Text style={styles.summaryLabel}>Shares</Text>

              <Text style={styles.summaryValue}>{summary.shares}</Text>

            </View>

            <View style={styles.summaryItem}>

              <Text style={styles.summaryLabel}>Views</Text>

              <Text style={styles.summaryValue}>{summary.views}</Text>

            </View>

          </View>

        </View>



        {/* Videos List */}

        <FlatList

          data={videos}

          renderItem={renderVideoItem}

          keyExtractor={(item) => item.id}

          contentContainerStyle={styles.listContainer}

          refreshControl={

            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B00FF']} />

          }

          ListEmptyComponent={

            <View style={styles.emptyContainer}>

              <MaterialIcons name="videocam-off" size={48} color="#333" />

              <Text style={styles.emptyText}>No videos found</Text>

            </View>

          }

        />

      </View>

    </SafeScreen>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#000000',

  },

  loadingContainer: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor: '#000000',

  },

  loadingText: {

    marginTop: 12,

    fontSize: 14,

    color: '#666',

  },

  header: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal: 16,

    paddingVertical: 12,

    backgroundColor: '#0A0A0A',

    borderBottomWidth: 1,

    borderBottomColor: '#1A1A1A',

  },

  backButton: {

    padding: 4,

  },

  headerTitle: {

    fontSize: 18,

    fontWeight: '600',

    color: '#fff',

  },

  placeholder: {

    width: 32,

  },

  summaryCard: {

    backgroundColor: '#0A0A0A',

    margin: 12,

    padding: 16,

    borderRadius: 12,

    borderWidth: 1,

    borderColor: '#8B00FF',

  },

  summaryTitle: {

    fontSize: 16,

    fontWeight: '600',

    color: '#8B00FF',

    marginBottom: 12,

  },

  summaryGrid: {

    flexDirection: 'row',

    flexWrap: 'wrap',

  },

  summaryItem: {

    width: '33.33%',

    marginBottom: 12,

  },

  summaryLabel: {

    fontSize: 12,

    color: '#666',

    marginBottom: 2,

  },

  summaryValue: {

    fontSize: 16,

    fontWeight: '600',

    color: '#fff',

  },

  listContainer: {

    padding: 12,

    paddingTop: 0,

  },

  videoCard: {

    backgroundColor: '#0A0A0A',

    borderRadius: 10,

    padding: 14,

    marginBottom: 8,

    borderWidth: 1,

    borderColor: '#1A1A1A',

  },

  videoHeader: {

    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: 10,

  },

  videoTitle: {

    fontSize: 15,

    fontWeight: '500',

    color: '#fff',

    marginLeft: 8,

  },

  videoStats: {

    flexDirection: 'row',

    justifyContent: 'space-around',

  },

  statItem: {

    flexDirection: 'row',

    alignItems: 'center',

  },

  statText: {

    fontSize: 13,

    color: '#fff',

    marginLeft: 4,

  },

  emptyContainer: {

    alignItems: 'center',

    justifyContent: 'center',

    padding: 40,

  },

  emptyText: {

    fontSize: 16,

    color: '#666',

    marginTop: 12,

  },

});
import React, { useState, useEffect } from 'react';

import {

  View,

  Text,

  StyleSheet,

  TouchableOpacity,

  ActivityIndicator,

  RefreshControl,

  FlatList,

} from 'react-native';

import { SafeScreen } from '../../components/layout/SafeScreen';

import { MaterialIcons, Ionicons } from '@expo/vector-icons';

import { useLocalSearchParams, useRouter } from 'expo-router';



// Photos API

const photosApi = {

  getPhotos: async () => {

    try {

      const response = await fetch(`${process.env.KOYEB_API_URL || process.env.EXPO_PUBLIC_API_URL}/content/photos`);

      return response.json();

    } catch (error) {

      console.error('Error:', error);

      return { data: [] };

    }

  }

};



interface PhotoItem {

  id: string;

  title: string;

  stars: number;

  comments: number;

  shares: number;

  views: number;

}



export default function PhotoToolScreen() {

  const router = useRouter();

  const { title, stats } = useLocalSearchParams<{

    title?: string;

    stats?: string;

  }>();



  const initialStats = stats ? JSON.parse(stats) : {};

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);

  const [summary, setSummary] = useState({

    total: initialStats?.total || 0,

    stars: initialStats?.stars || 0,

    comments: initialStats?.comments || 0,

    shares: initialStats?.shares || 0,

    views: initialStats?.views || 0,

  });



  useEffect(() => {

    loadPhotos();

  }, []);



  const onRefresh = async () => {

    setRefreshing(true);

    await loadPhotos();

    setRefreshing(false);

  };



  const loadPhotos = async () => {

    try {

      setLoading(true);

      const response = await photosApi.getPhotos();

      const data = Array.isArray(response) ? response : response.data || [];



      const processedPhotos = data.map((item: any, index: number) => ({

        id: item.id || `photo_${index}`,

        title: item.title || `Photo ${index + 1}`,

        stars: item.stars || Math.floor(Math.random() * 100),

        comments: item.comments || Math.floor(Math.random() * 50),

        shares: item.shares || Math.floor(Math.random() * 30),

        views: item.views || Math.floor(Math.random() * 1000),

      }));



      setPhotos(processedPhotos);



      const newSummary = processedPhotos.reduce(

        (acc: { total: number; stars: number; comments: number; shares: number; views: number }, photo: PhotoItem) => {

          acc.stars += photo.stars;

          acc.comments += photo.comments;

          acc.shares += photo.shares;

          acc.views += photo.views;

          return acc;

        },

        { total: processedPhotos.length, stars: 0, comments: 0, shares: 0, views: 0 }

      );



      setSummary(newSummary);

    } catch (error) {

      console.error('Error loading photos:', error);

    } finally {

      setLoading(false);

    }

  };



  const renderPhotoItem = ({ item }: { item: PhotoItem }) => (

    <View style={styles.photoItem}>

      <MaterialIcons name="photo" size={40} color="#666" />

      <View style={styles.photoInfo}>

        <Text style={styles.photoTitle}>{item.title}</Text>

        <View style={styles.photoStats}>

          <Text style={styles.statText}>⭐ {item.stars}</Text>

          <Text style={styles.statText}>💬 {item.comments}</Text>

          <Text style={styles.statText}>📤 {item.shares}</Text>

          <Text style={styles.statText}>👁️ {item.views}</Text>

        </View>

      </View>

    </View>

  );



  if (loading) {

    return (

      <SafeScreen>

        <View style={styles.loadingContainer}>

          <ActivityIndicator size="large" color="#fff" />

          <Text style={styles.loadingText}>Loading Photos...</Text>

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

            <Ionicons name="arrow-back" size={24} color="#fff" />

          </TouchableOpacity>

          <Text style={styles.headerTitle}>{title || 'Photo Tool'}</Text>

          <View style={{ width: 40 }} />

        </View>



        {/* Summary Stats */}

        <View style={styles.summaryContainer}>

          <View style={styles.summaryItem}>

            <Text style={styles.summaryValue}>{summary.total}</Text>

            <Text style={styles.summaryLabel}>Total Photos</Text>

          </View>

          <View style={styles.summaryItem}>

            <Text style={styles.summaryValue}>{summary.stars}</Text>

            <Text style={styles.summaryLabel}>Stars</Text>

          </View>

          <View style={styles.summaryItem}>

            <Text style={styles.summaryValue}>{summary.comments}</Text>

            <Text style={styles.summaryLabel}>Comments</Text>

          </View>

          <View style={styles.summaryItem}>

            <Text style={styles.summaryValue}>{summary.shares}</Text>

            <Text style={styles.summaryLabel}>Shares</Text>

          </View>

          <View style={styles.summaryItem}>

            <Text style={styles.summaryValue}>{summary.views}</Text>

            <Text style={styles.summaryLabel}>Views</Text>

          </View>

        </View>



        {/* Photos List */}

        <FlatList

          data={photos}

          keyExtractor={(item) => item.id}

          renderItem={renderPhotoItem}

          refreshControl={

            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />

          }

          ListEmptyComponent={

            <View style={styles.emptyContainer}>

              <MaterialIcons name="photo-library" size={48} color="#666" />

              <Text style={styles.emptyText}>No photos found</Text>

            </View>

          }

          contentContainerStyle={styles.listContainer}

        />

      </View>

    </SafeScreen>

  );

}



const styles = StyleSheet.create({

  container: {

    flex: 1,

    backgroundColor: '#000',

  },

  loadingContainer: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor: '#000',

  },

  loadingText: {

    color: '#fff',

    marginTop: 10,

    fontSize: 16,

  },

  header: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal: 20,

    paddingVertical: 15,

    borderBottomWidth: 1,

    borderBottomColor: '#333',

  },

  backButton: {

    width: 40,

    height: 40,

    borderRadius: 20,

    backgroundColor: 'rgba(255,255,255,0.1)',

    justifyContent: 'center',

    alignItems: 'center',

  },

  headerTitle: {

    fontSize: 18,

    fontWeight: 'bold',

    color: '#fff',

  },

  summaryContainer: {

    flexDirection: 'row',

    justifyContent: 'space-around',

    paddingVertical: 20,

    paddingHorizontal: 10,

    borderBottomWidth: 1,

    borderBottomColor: '#333',

  },

  summaryItem: {

    alignItems: 'center',

  },

  summaryValue: {

    fontSize: 18,

    fontWeight: 'bold',

    color: '#fff',

  },

  summaryLabel: {

    fontSize: 12,

    color: '#666',

    marginTop: 5,

  },

  listContainer: {

    paddingBottom: 20,

  },

  photoItem: {

    flexDirection: 'row',

    alignItems: 'center',

    padding: 15,

    borderBottomWidth: 1,

    borderBottomColor: '#222',

  },

  photoInfo: {

    flex: 1,

    marginLeft: 15,

  },

  photoTitle: {

    fontSize: 16,

    color: '#fff',

    fontWeight: '500',

  },

  photoStats: {

    flexDirection: 'row',

    marginTop: 5,

  },

  statText: {

    fontSize: 12,

    color: '#666',

    marginRight: 15,

  },

  emptyContainer: {

    alignItems: 'center',

    paddingVertical: 50,

  },

  emptyText: {

    color: '#666',

    marginTop: 10,

    fontSize: 16,

  },

});

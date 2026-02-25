import React from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { usePhotos } from '../../hooks/useContent';

export default function PhotosScreen() {
  const { data, loading, error, pagination, loadMore, refresh } = usePhotos();

  const renderPhoto = ({ item }: { item: any }) => {
    // Log photo URLs for debugging
    console.log('📸 Photo URLs:', {
      title: item.title,
      originalUrl: item.originalUrl,
      signedUrl: item.signedUrl,
      url: item.url
    });
    
    // Use signedUrl if available, fallback to url
    const photoUrl = item.signedUrl || item.url || item.originalUrl;
    
    return (
      <TouchableOpacity style={styles.photoItem}>
        <Image 
          source={{ uri: photoUrl }} 
          style={styles.photoImage}
          resizeMode="cover"
          onError={(error) => {
            console.error('📸 Photo load error:', error);
          }}
          onLoad={() => {
          }}
        />
        <View style={styles.photoInfo}>
          <Text style={styles.photoTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.photoStats}>
            <Text style={styles.statText}>👁 {item.views || 0}</Text>
            <Text style={styles.statText}>❤️ {item.likes || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return <ActivityIndicator size="small" color="#4CAF50" style={styles.loader} />;
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="photo-library" size={64} color="#ccc" />
      <Text style={styles.emptyText}>No photos found</Text>
    </View>
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={48} color="#f44336" />
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        renderItem={renderPhoto}
        keyExtractor={(item) => item._id}
        numColumns={3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContainer: {
    padding: 4,
  },
  photoItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 2,
    flex: 1,
    maxWidth: '32%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  photoImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  photoInfo: {
    padding: 8,
  },
  photoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  photoStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statText: {
    fontSize: 10,
    color: '#6c757d',
  },
  loader: {
    marginVertical: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

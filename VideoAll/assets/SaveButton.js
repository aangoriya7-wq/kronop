// Save button component for video player
// Bookmark and save functionality with collections

import React, { useState } from 'react';
import { TouchableOpacity, Text, View, Modal, FlatList, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SaveButton = ({ 
  size = 24, 
  videoId, 
  title,
  isSaved = false,
  onPress,
  style 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [collections, setCollections] = useState([
    { id: 1, name: 'Favorites', icon: '❤️', count: 0 },
    { id: 2, name: 'Watch Later', icon: '⏰', count: 0 },
    { id: 3, name: 'Travel', icon: '✈️', count: 0 },
    { id: 4, name: 'Food', icon: '🍕', count: 0 },
    { id: 5, name: 'Music', icon: '🎵', count: 0 },
  ]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [newCollectionName, setNewCollectionName] = useState('');
  
  const handlePress = () => {
    setModalVisible(true);
    onPress?.();
  };
  
  const toggleSave = () => {
    Alert.alert(
      isSaved ? 'Remove from Saved' : 'Save Video',
      isSaved ? 'Video removed from your collection' : 'Video saved to your collection',
      [
        { text: 'OK', onPress: () => {} }
      ]
    );
  };
  
  const addToCollection = (collection) => {
    const updatedCollections = collections.map(col => 
      col.id === collection.id 
        ? { ...col, count: col.count + 1 }
        : col
    );
    setCollections(updatedCollections);
    setSelectedCollection(collection);
    
    Alert.alert(
      'Saved!',
      `Added to ${collection.name} collection`,
      [
        { text: 'OK', onPress: () => {} }
      ]
    );
  };
  
  const createNewCollection = () => {
    if (newCollectionName.trim()) {
      const newCollection = {
        id: Date.now(),
        name: newCollectionName,
        icon: '📁',
        count: 1
      };
      setCollections([...collections, newCollection]);
      setNewCollectionName('');
      setSelectedCollection(newCollection);
    }
  };
  
  const renderCollection = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.collectionItem,
        selectedCollection?.id === item.id && styles.selectedCollection
      ]}
      onPress={() => addToCollection(item)}
    >
      <Text style={styles.collectionIcon}>{item.icon}</Text>
      <Text style={styles.collectionName}>{item.name}</Text>
      <Text style={styles.collectionCount}>({item.count})</Text>
    </TouchableOpacity>
  );
  
  return (
    <>
      <TouchableOpacity 
        onPress={toggleSave}
        style={[styles.container, style]}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isSaved ? 'bookmark' : 'bookmark-outline'} 
          size={size} 
          color={isSaved ? '#FFD700' : '#FFFFFF'} 
        />
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save to Collection</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.videoTitle}>{title}</Text>
            
            {/* Collections */}
            <View style={styles.collectionsContainer}>
              <FlatList
                data={collections}
                renderItem={renderCollection}
                keyExtractor={item => item.id.toString()}
                style={styles.collectionsList}
                numColumns={2}
              />
            </View>
            
            {/* Create new collection */}
            <View style={styles.newCollectionContainer}>
              <TextInput
                style={styles.collectionInput}
                value={newCollectionName}
                onChangeText={setNewCollectionName}
                placeholder="Create new collection..."
                maxLength={30}
              />
              <TouchableOpacity 
                style={styles.createButton}
                onPress={createNewCollection}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = {
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  videoTitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  collectionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  collectionsList: {
    marginBottom: 20,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    margin: 5,
    backgroundColor: '#F8F8F8',
  },
  selectedCollection: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FF',
  },
  collectionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  collectionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  collectionCount: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newCollectionContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  collectionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

export default SaveButton;

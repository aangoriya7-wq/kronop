import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import StatusBarOverlay from '../../components/common/StatusBarOverlay';
// import { userService, User } from '../../services/userService'; // Removed - services folder deleted

// Define User interface since services folder was deleted
interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  supporters: number;
  supporting: number;
  posts: number;
  bio?: string;
  isOnline?: boolean;
  isSupporting?: boolean; // Add isSupporting property
}

// Demo users that will always remain (5-6 users as requested)
const demoUsers: User[] = [
  {
    id: 'demo_1',
    username: 'payal_kumar',
    displayName: 'Payal Kumar',
    avatar: 'https://picsum.photos/100/100?random=101',
    supporters: 15420,
    supporting: 892,
    posts: 234,
    isSupporting: false
  },
  {
    id: 'demo_2',
    username: 'rahul_sharma',
    displayName: 'Rahul Sharma',
    avatar: 'https://picsum.photos/100/100?random=102',
    supporters: 8934,
    supporting: 456,
    posts: 567,
    isSupporting: false
  },
  {
    id: 'demo_3',
    username: 'priya_patel',
    displayName: 'Priya Patel',
    avatar: 'https://picsum.photos/100/100?random=103',
    supporters: 23456,
    supporting: 234,
    posts: 189,
    isSupporting: false
  },
  {
    id: 'demo_4',
    username: 'amit_singh',
    displayName: 'Amit Singh',
    avatar: 'https://picsum.photos/100/100?random=104',
    supporters: 12456,
    supporting: 678,
    posts: 445,
    isSupporting: false
  },
  {
    id: 'demo_5',
    username: 'neha_verma',
    displayName: 'Neha Verma',
    avatar: 'https://picsum.photos/100/100?random=105',
    supporters: 34567,
    supporting: 123,
    posts: 678,
    isSupporting: false
  },
  {
    id: 'demo_6',
    username: 'vijay_kumar',
    displayName: 'Vijay Kumar',
    avatar: 'https://picsum.photos/100/100?random=106',
    supporters: 45678,
    supporting: 234,
    posts: 234,
    isSupporting: false
  }
];

export default function SearchUserScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Search functionality with MongoDB
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setFilteredUsers([]);
      return;
    }

    setLoading(true);
    
    try {
      // Search from MongoDB - Removed - using mock
      // const result = await userService.searchUsers(query.trim());
      
      // Mock search result
      const result = { 
        success: true, 
        data: [], // No MongoDB users for now, only demo users
        message: 'Search completed successfully'
      };
      
      if (result.success && result.data) {
        // Combine demo users with MongoDB results
        // Demo users always appear first
        const demoFiltered = demoUsers.filter(user => 
          user.username.toLowerCase().includes(query.toLowerCase()) ||
          user.displayName.toLowerCase().includes(query.toLowerCase())
        );
        
        // Remove duplicates and combine
        const mongoUsers = result.data.filter((user: User) => 
          !demoFiltered.some(demo => demo.id === user.id)
        );
        
        const allUsers = [...demoFiltered, ...mongoUsers];
        setFilteredUsers(allUsers);
        
        // Show message if no results found
        if (allUsers.length === 0 && result.message) {
          console.log('No results found message:', result.message);
        }
      } else {
        // Fallback to demo users only
        const demoFiltered = demoUsers.filter(user => 
          user.username.toLowerCase().includes(query.toLowerCase()) ||
          user.displayName.toLowerCase().includes(query.toLowerCase())
        );
        setFilteredUsers(demoFiltered);
      }
      
      // Add to search history
      if (query.trim() && !searchHistory.includes(query)) {
        setSearchHistory(prev => [query, ...prev.slice(0, 4)]);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to demo users
      const demoFiltered = demoUsers.filter(user => 
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.displayName.toLowerCase().includes(query.toLowerCase()) ||
        (user.bio && user.bio.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredUsers(demoFiltered);
    } finally {
      setLoading(false);
    }
  };

  const handleUserPress = (userId: string) => {
    // Profile navigation removed - system purged
    console.log(`User ${userId} pressed - profile system removed`);
  };

  const handleSupport = async (userId: string) => {
    try {
      // const result = await userService.supportUser(userId); // Removed - using mock
      // Mock support result
      const result = {
        success: true,
        data: {
          isSupporting: true,
          supporters: 999
        }
      };
      
      if (result.success && result.data) {
        // Update local state
        setFilteredUsers(prev => prev.map(user => 
          user.id === userId 
            ? { 
                ...user, 
                isSupporting: result.data!.isSupporting,
                supporters: result.data!.supporters
              }
            : user
        ));
      }
    } catch (error) {
      console.error('Support error:', error);
    }
  };

  const handleHistoryPress = (query: string) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userItem}
      onPress={() => handleUserPress(item.id)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: item.avatar }} 
        style={styles.userAvatar}
        contentFit="cover"
      />
      
      <View style={styles.userInfo}>
        <Text style={styles.displayName}>{item.displayName}</Text>
        <Text style={styles.username}>@{item.username}</Text>
        
        <View style={styles.userStats}>
          <Text style={styles.statText}>
            <Text style={styles.statNumber}>{item.supporters.toLocaleString()}</Text> supporters
          </Text>
          <Text style={styles.statText}>
            <Text style={styles.statNumber}>{item.posts}</Text> posts
          </Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.supportButton, item.isSupporting && styles.supportButtonActive]}
        onPress={() => handleSupport(item.id)}
        activeOpacity={0.7}
      >
        <Text style={[styles.supportButtonText, item.isSupporting && styles.supportButtonTextActive]}>
          {item.isSupporting ? 'Supporting' : 'Support'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderHistoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.historyItem}
      onPress={() => handleHistoryPress(item)}
      activeOpacity={0.7}
    >
      <MaterialIcons name="history" size={20} color="#888" />
      <Text style={styles.historyText}>{item}</Text>
      <TouchableOpacity 
        onPress={() => {
          setSearchHistory(prev => prev.filter(h => h !== item));
        }}
        activeOpacity={0.7}
      >
        <MaterialIcons name="close" size={20} color="#888" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBarOverlay style="light" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: 40 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus={true}
            clearButtonMode="never"
            contextMenuHidden={true}
            selectTextOnFocus={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => {
                setSearchQuery('');
                setFilteredUsers([]);
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons name="clear" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B00FF" />
            <Text style={styles.loadingText}>Searching users...</Text>
          </View>
        ) : searchQuery.trim() === '' ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="person-search" size={64} color="#666" />
            <Text style={styles.emptyTitle}>Search User Fatafat</Text>
            <Text style={styles.emptySubtitle}>Find users by username or name</Text>
            
            {searchHistory.length > 0 && (
              <View style={styles.historyContainer}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>Recent Searches</Text>
                  <TouchableOpacity 
                    onPress={clearSearchHistory}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.clearHistoryText}>Clear All</Text>
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={searchHistory}
                  keyExtractor={(item, index) => `history-${index}`}
                  renderItem={renderHistoryItem}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>
        ) : filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="search-off" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No users found</Text>
            <Text style={styles.emptySubtitle}>Try searching with different keywords</Text>
          </View>
        ) : (
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.usersList}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 25,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    height: 45,
  },
  searchIcon: {
    marginRight: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: theme.typography.fontSize.md,
    paddingVertical: 0,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  historyContainer: {
    width: '100%',
    marginTop: theme.spacing.xl * 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  historyTitle: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  clearHistoryText: {
    fontSize: theme.typography.fontSize.sm,
    color: '#8B00FF',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginVertical: 2,
  },
  historyText: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginLeft: theme.spacing.md,
  },
  usersList: {
    paddingVertical: theme.spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  userInfo: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  displayName: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  username: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  userStats: {
    flexDirection: 'row',
    marginTop: 8,
    gap: theme.spacing.md,
  },
  statText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  statNumber: {
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  supportButton: {
    backgroundColor: '#8B00FF',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginLeft: theme.spacing.sm,
  },
  supportButtonActive: {
    backgroundColor: 'rgba(139, 0, 255, 0.2)',
    borderWidth: 1,
    borderColor: '#8B00FF',
  },
  supportButtonText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  supportButtonTextActive: {
    color: '#8B00FF',
  },
});

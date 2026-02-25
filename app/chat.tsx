import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeScreen } from '../components/layout';
import { theme } from '../constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService } from '../services/chatService';

type ChatTab = 'support' | 'supporting';

interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
}

// Mock data for supporters (people who support you)
const SUPPORTERS: ChatUser[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    lastMessage: 'Love your content! Keep it up 🔥',
    timestamp: '2m ago',
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: '2',
    name: 'Mike Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    lastMessage: 'Thanks for the amazing videos',
    timestamp: '1h ago',
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: '3',
    name: 'Emma Wilson',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    lastMessage: 'Can you make more tutorials?',
    timestamp: '3h ago',
    unreadCount: 1,
    isOnline: false,
  },
  {
    id: '4',
    name: 'David Kumar',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    lastMessage: 'Great work!',
    timestamp: '5h ago',
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    lastMessage: 'Subscribed to your channel',
    timestamp: '1d ago',
    unreadCount: 0,
    isOnline: true,
  },
];

// Mock data for supporting (people you support)
const SUPPORTING: ChatUser[] = [
  {
    id: '6',
    name: 'Tech Master',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    lastMessage: 'New video uploaded!',
    timestamp: '30m ago',
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: '7',
    name: 'Creative Studio',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
    lastMessage: 'Check out my latest design',
    timestamp: '2h ago',
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: '8',
    name: 'Code Academy',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    lastMessage: 'Live coding session tomorrow',
    timestamp: '4h ago',
    unreadCount: 3,
    isOnline: true,
  },
  {
    id: '9',
    name: 'Design Hub',
    avatar: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150',
    lastMessage: 'Thanks for your support!',
    timestamp: '6h ago',
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: '10',
    name: 'Music Production',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    lastMessage: 'New beat drop 🎵',
    timestamp: '1d ago',
    unreadCount: 0,
    isOnline: true,
  },
];

export default memo(function ChatScreen() {
  const [activeTab, setActiveTab] = useState<ChatTab>('support');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatUser[]>([]);
  const router = useRouter();

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Just now';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const loadConversations = React.useCallback(async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem('user_data');
      const user = stored ? JSON.parse(stored) : null;
      const currentUserId = user?._id || user?.id;
      
      if (!currentUserId) {
        const fallbackData = activeTab === 'support' ? SUPPORTERS : SUPPORTING;
        setConversations(fallbackData);
        return;
      }
      const convs = await chatService.getConversations(String(currentUserId));
      const transformedChats: ChatUser[] = convs.map((conv: any) => {
        const otherId = (conv.participants || []).find((p: string) => String(p) !== String(currentUserId));
        return {
          id: conv.id || otherId || String(Math.random()),
          name: conv.participant?.name || 'Conversation',
          avatar: conv.participant?.avatar || 'https://picsum.photos/seed/avatar/150',
          lastMessage: conv.lastMessage || 'No messages yet',
          timestamp: formatTimestamp(conv.lastMessageTime),
          unreadCount: 0,
          isOnline: false,
        };
      });
      setConversations(transformedChats);
    } catch {
      const fallbackData = activeTab === 'support' ? SUPPORTERS : SUPPORTING;
      setConversations(fallbackData);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadConversations();
  }, [activeTab, loadConversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };


  const filteredChats = conversations.filter((chat) =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChatPress = (user: ChatUser) => {
    router.push({
      pathname: '/chat-detail',
      params: {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        isOnline: user.isOnline.toString(),
      },
    });
  };

  const renderChatItem = ({ item }: { item: ChatUser }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => handleChatPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.timestamp}>{item.timestamp}</Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const totalUnread =
    activeTab === 'support'
      ? SUPPORTERS.reduce((sum, chat) => sum + chat.unreadCount, 0)
      : SUPPORTING.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <SafeScreen edges={['top']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color={theme.colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'support' && styles.activeTab]}
          onPress={() => setActiveTab('support')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="favorite"
            size={20}
            color={activeTab === 'support' ? theme.colors.primary.main : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'support' && styles.activeTabText]}>
            Support
          </Text>
          {activeTab === 'support' && SUPPORTERS.reduce((sum, chat) => sum + chat.unreadCount, 0) > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {SUPPORTERS.reduce((sum, chat) => sum + chat.unreadCount, 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'supporting' && styles.activeTab]}
          onPress={() => setActiveTab('supporting')}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="person-add"
            size={20}
            color={activeTab === 'supporting' ? theme.colors.primary.main : theme.colors.text.secondary}
          />
          <Text style={[styles.tabText, activeTab === 'supporting' && styles.activeTabText]}>
            Supporting
          </Text>
          {activeTab === 'supporting' && SUPPORTING.reduce((sum, chat) => sum + chat.unreadCount, 0) > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>
                {SUPPORTING.reduce((sum, chat) => sum + chat.unreadCount, 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.main} />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : filteredChats.length > 0 ? (
        <FlatList
          data={filteredChats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary.main]}
              tintColor={theme.colors.primary.main}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name={activeTab === 'support' ? 'favorite-border' : 'person-add-disabled'}
            size={80}
            color={theme.colors.text.tertiary}
          />
          <Text style={styles.emptyTitle}>
            {searchQuery
              ? 'No results found'
              : activeTab === 'support'
              ? 'No supporters yet'
              : 'Not supporting anyone yet'
            }
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try a different search term'
              : activeTab === 'support'
              ? 'When people support you, they\'ll appear here'
              : 'Start supporting creators to see them here'
            }
          </Text>
        </View>
      )}
    </SafeScreen>
  );
});

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.tertiary,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: theme.spacing.md,
    height: 40,
    gap: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
    padding: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary.main,
  },
  tabText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
  },
  activeTabText: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeight.bold,
  },
  tabBadge: {
    backgroundColor: theme.colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeText: {
    color: 'white',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  chatList: {
    paddingBottom: theme.spacing.lg,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.background.tertiary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: theme.colors.background.primary,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  timestamp: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.xs,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    marginRight: theme.spacing.sm,
  },
  unreadBadge: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    color: 'white',
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.md,
    marginTop: 10,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
    textAlign: 'center',
    marginTop: 5,
  },
});

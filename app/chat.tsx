import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import StatusBarOverlay from '@/components/common/StatusBarOverlay';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  message: string;
  timestamp: Date;
  isMine: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isOnline: boolean;
}

// Mock chat data
const mockUsers: ChatUser[] = [
  {
    id: 'user1',
    name: 'Payal Kumar',
    avatar: 'https://picsum.photos/100/100?random=201',
    lastMessage: 'Hey! How are you?',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: 'user2',
    name: 'Rahul Sharma',
    avatar: 'https://picsum.photos/100/100?random=202',
    lastMessage: 'Thanks for the follow!',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: 'user3',
    name: 'Priya Patel',
    avatar: 'https://picsum.photos/100/100?random=203',
    lastMessage: 'Your content is amazing! 💯',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    unreadCount: 1,
    isOnline: true,
  },
];

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    senderId: 'user1',
    senderName: 'Payal Kumar',
    senderAvatar: 'https://picsum.photos/100/100?random=201',
    message: 'Hey! How are you?',
    timestamp: new Date(Date.now() - 1000 * 60 * 10),
    isMine: false,
  },
  {
    id: '2',
    senderId: 'me',
    senderName: 'You',
    senderAvatar: 'https://picsum.photos/100/100?random=100',
    message: 'Hi Payal! I\'m doing great, thanks! How about you?',
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
    isMine: true,
  },
  {
    id: '3',
    senderId: 'user1',
    senderName: 'Payal Kumar',
    senderAvatar: 'https://picsum.photos/100/100?random=201',
    message: 'I\'m good too! Loved your latest post 😊',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    isMine: false,
  },
];

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState<ChatUser[]>(mockUsers);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (selectedChat) {
      setMessages(mockMessages);
      // Mark messages as read
      setUsers(prev => prev.map(user =>
        user.id === selectedChat.id ? { ...user, unreadCount: 0 } : user
      ));
    }
  }, [selectedChat]);

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'me',
      senderName: 'You',
      senderAvatar: 'https://picsum.photos/100/100?random=100',
      message: newMessage.trim(),
      timestamp: new Date(),
      isMine: true,
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderChatItem = ({ item }: { item: ChatUser }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => setSelectedChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: item.avatar }}
          style={styles.avatar}
          contentFit="cover"
        />
        {item.isOnline && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.chatInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>

      <View style={styles.chatMeta}>
        <Text style={styles.timestamp}>
          {item.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View style={[
      styles.messageContainer,
      item.isMine ? styles.myMessage : styles.theirMessage
    ]}>
      {!item.isMine && (
        <Image
          source={{ uri: item.senderAvatar }}
          style={styles.messageAvatar}
          contentFit="cover"
        />
      )}

      <View style={[
        styles.messageBubble,
        item.isMine ? styles.myBubble : styles.theirBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isMine ? styles.myMessageText : styles.theirMessageText
        ]}>
          {item.message}
        </Text>
        <Text style={[
          styles.messageTime,
          item.isMine ? styles.myMessageTime : styles.theirMessageTime
        ]}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  if (selectedChat) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBarOverlay style="light" backgroundColor="#000000" />

        {/* Chat Header */}
        <View style={[styles.chatHeader, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedChat(null)}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Image
              source={{ uri: selectedChat.avatar }}
              style={styles.headerAvatar}
              contentFit="cover"
            />
            <View>
              <Text style={styles.headerName}>{selectedChat.name}</Text>
              <Text style={styles.headerStatus}>
                {selectedChat.isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
              <MaterialIcons name="videocam" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
              <MaterialIcons name="call" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        />

        {/* Message Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
          keyboardVerticalOffset={insets.bottom + 10}
        >
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton} activeOpacity={0.7}>
              <MaterialIcons name="attach-file" size={24} color="#888" />
            </TouchableOpacity>

            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#888"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />

            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim()}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="send"
                size={20}
                color={newMessage.trim() ? "#fff" : "#888"}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBarOverlay style="light" backgroundColor="#000000" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="close" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chatListContainer}
      />
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  chatList: {
    flex: 1,
  },
  chatListContainer: {
    paddingVertical: 10,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#888',
  },
  chatMeta: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  unreadBadge: {
    backgroundColor: '#8B00FF',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Chat Header Styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    padding: 8,
  },
  // Messages Styles
  messagesList: {
    flex: 1,
    backgroundColor: '#000',
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  messageBubble: {
    maxWidth: screenWidth * 0.7,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: '#8B00FF',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  theirMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },
  theirMessageTime: {
    color: 'rgba(255,255,255,0.5)',
  },
  // Input Styles
  inputContainer: {
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  attachButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B00FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
});

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeScreen } from '../components/layout';
import { theme } from '../constants/theme';
import { useAlert } from '../template';

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    text: 'Hey! How are you?',
    timestamp: '10:30 AM',
    isMine: false,
    status: 'read',
  },
  {
    id: '2',
    text: 'I am good! Thanks for asking 😊',
    timestamp: '10:32 AM',
    isMine: true,
    status: 'read',
  },
  {
    id: '3',
    text: 'Love your latest video! The editing was amazing',
    timestamp: '10:33 AM',
    isMine: false,
    status: 'read',
  },
  {
    id: '4',
    text: 'Thank you so much! Really appreciate the support 🙏',
    timestamp: '10:35 AM',
    isMine: true,
    status: 'read',
  },
  {
    id: '5',
    text: 'Can you make a tutorial on video editing?',
    timestamp: '10:36 AM',
    isMine: false,
    status: 'read',
  },
  {
    id: '6',
    text: "That's a great idea! I'll work on it this week",
    timestamp: '10:38 AM',
    isMine: true,
    status: 'delivered',
  },
];

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { userName, userAvatar, isOnline } = params;

  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { showAlert } = useAlert();

  const handleSend = () => {
    if (isBlocked) {
      showAlert('Cannot Send Message', 'You have blocked this user');
      return;
    }

    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText.trim(),
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isMine: true,
        status: 'sent',
      };

      setMessages([...messages, newMessage]);
      setInputText('');

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Simulate delivered status
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
          )
        );
      }, 1000);

      // Simulate read status
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id ? { ...msg, status: 'read' } : msg
          )
        );
      }, 2000);
    }
  };

  const handleVoiceCall = () => {
    setShowMenu(false);
    if (isBlocked) {
      showAlert('Cannot Call', 'You have blocked this user');
      return;
    }
    showAlert('Voice Call', `Calling ${userName}...`);
  };

  const handleVideoCall = () => {
    setShowMenu(false);
    if (isBlocked) {
      showAlert('Cannot Call', 'You have blocked this user');
      return;
    }
    showAlert('Video Call', `Starting video call with ${userName}...`);
  };

  const handleBlockUser = () => {
    setShowMenu(false);
    Alert.alert(
      isBlocked ? 'Unblock User' : 'Block User',
          isBlocked
        ? `Unblock ${userName}? You will be able to message and call them again.`
        : `Block ${userName}? You will not be able to message or call them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isBlocked ? 'Unblock' : 'Block',
          style: isBlocked ? 'default' : 'destructive',
          onPress: () => {
            setIsBlocked(!isBlocked);
            showAlert(
              isBlocked ? 'User Unblocked' : 'User Blocked',
              isBlocked
                ? `${userName} has been unblocked`
                : `${userName} has been blocked`
            );
          },
        },
      ]
    );
  };

  const handleReportUser = () => {
    setShowMenu(false);
    showAlert('Report User', 'Report functionality will be available soon');
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageContainer,
        item.isMine ? styles.myMessage : styles.theirMessage,
      ]}
    >
      {!item.isMine && (
        <Image
          source={{ uri: userAvatar as string }}
          style={styles.messageAvatar}
        />
      )}
      <View
        style={[
          styles.messageBubble,
          item.isMine ? styles.myBubble : styles.theirBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.isMine ? styles.myMessageText : styles.theirMessageText,
          ]}
        >
          {item.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text
            style={[
              styles.messageTime,
              item.isMine ? styles.myMessageTime : styles.theirMessageTime,
            ]}
          >
            {item.timestamp}
          </Text>
          {item.isMine && (
            <MaterialIcons
              name={
                item.status === 'read'
                  ? 'done-all'
                  : item.status === 'delivered'
                  ? 'done-all'
                  : 'done'
              }
              size={14}
              color={item.status === 'read' ? '#4CAF50' : 'rgba(255,255,255,0.6)'}
              style={styles.statusIcon}
            />
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeScreen edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={theme.hitSlop.md}
            style={styles.backButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={theme.iconSize.xl}
              color={theme.colors.text.primary}
            />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: userAvatar as string }}
                style={styles.headerAvatar}
              />
              {isOnline === 'true' && <View style={styles.onlineIndicator} />}
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerName}>{userName}</Text>
              <Text style={styles.headerStatus}>
                {isOnline === 'true' ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              hitSlop={theme.hitSlop.md}
              style={styles.headerButton}
              onPress={handleVoiceCall}
            >
              <MaterialIcons
                name="phone"
                size={theme.iconSize.xl}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={theme.hitSlop.md}
              style={styles.headerButton}
              onPress={handleVideoCall}
            >
              <MaterialIcons
                name="videocam"
                size={theme.iconSize.xl}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={theme.hitSlop.md}
              style={styles.headerButton}
              onPress={() => setShowMenu(true)}
            >
              <MaterialIcons
                name="more-vert"
                size={theme.iconSize.xl}
                color={theme.colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Modal */}
        <Modal
          visible={showMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          >
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Chat Options</Text>
                <TouchableOpacity onPress={() => setShowMenu(false)}>
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={theme.colors.text.primary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleVoiceCall}
              >
                <MaterialIcons
                  name="phone"
                  size={24}
                  color={theme.colors.text.primary}
                />
                <Text style={styles.menuItemText}>Voice Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleVideoCall}
              >
                <MaterialIcons
                  name="videocam"
                  size={24}
                  color={theme.colors.text.primary}
                />
                <Text style={styles.menuItemText}>Video Call</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={handleBlockUser}
              >
                <MaterialIcons
                  name={isBlocked ? 'check-circle' : 'block'}
                  size={24}
                  color={isBlocked ? theme.colors.success : theme.colors.error}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    { color: isBlocked ? theme.colors.success : theme.colors.error },
                  ]}
                >
                  {isBlocked ? 'Unblock User' : 'Block User'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={handleReportUser}
              >
                <MaterialIcons
                  name="flag"
                  size={24}
                  color={theme.colors.error}
                />
                <Text style={[styles.menuItemText, { color: theme.colors.error }]}>
                  Report User
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Blocked User Banner */}
        {isBlocked && (
          <View style={styles.blockedBanner}>
            <MaterialIcons name="block" size={20} color={theme.colors.error} />
            <Text style={styles.blockedText}>
              You have blocked {userName}
            </Text>
            <TouchableOpacity onPress={handleBlockUser}>
              <Text style={styles.unblockButton}>Unblock</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input */}
        <View style={[styles.inputContainer, isBlocked && styles.inputDisabled]}>
          <TouchableOpacity style={styles.attachButton}>
            <MaterialIcons
              name="add-circle"
              size={28}
              color={theme.colors.primary.main}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            placeholder={isBlocked ? 'User is blocked' : 'Type a message...'}
            placeholderTextColor={theme.colors.text.tertiary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isBlocked}
          />

          {inputText.trim() ? (
            <TouchableOpacity
              style={[styles.sendButton, isBlocked && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={isBlocked}
            >
              <MaterialIcons name="send" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.voiceButton}
              disabled={isBlocked}
            >
              <MaterialIcons
                name="mic"
                size={24}
                color={isBlocked ? theme.colors.text.tertiary : theme.colors.text.primary}
              />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.sm,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.tertiary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: theme.colors.background.primary,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  headerStatus: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.xs,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  headerButton: {
    padding: theme.spacing.xs,
  },
  messagesList: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    alignItems: 'flex-end',
  },
  myMessage: {
    justifyContent: 'flex-end',
  },
  theirMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: theme.spacing.xs,
    backgroundColor: theme.colors.background.tertiary,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
  },
  myBubble: {
    backgroundColor: theme.colors.primary.main,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    backgroundColor: theme.colors.background.secondary,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: theme.typography.fontSize.md,
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: theme.colors.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: theme.typography.fontSize.xs,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirMessageTime: {
    color: theme.colors.text.tertiary,
  },
  statusIcon: {
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary,
    backgroundColor: theme.colors.background.primary,
  },
  attachButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.xs,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.xs,
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.xs,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.xl,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  menuTitle: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing.md,
  },
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.error + '20',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.error + '40',
  },
  blockedText: {
    flex: 1,
    color: theme.colors.error,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    marginLeft: theme.spacing.sm,
  },
  unblockButton: {
    color: theme.colors.primary.main,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  FlatList as FlatListType,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import all sections
import CameraSection from './sections/CameraSection';
import GallerySection from './sections/GallerySection';
import FilesSection from './sections/FilesSection';
import DriveSection from './sections/DriveSection';
import NotebookLMSection from './sections/NotebookLMSection';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  mediaUri?: string;
  mediaType?: 'camera' | 'gallery' | 'file' | 'drive' | 'note';
  mediaName?: string;
}

const SupportScreen = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: '👋 Hello! Welcome to Kronop Support. How can I help you today?', sender: 'ai' },
  ]);
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const flatListRef = useRef<FlatListType>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate AI typing
    setIsAiTyping(true);
    setTimeout(() => {
      const lowerInput = inputText.toLowerCase();
      let aiReplyText: string;
      
      if (lowerInput.includes('contact') || lowerInput.includes('phone') || lowerInput.includes('email')) {
        setShowContactInfo(true);
        aiReplyText = 'For your privacy, contact information is only shared when requested. Here\'s how you can reach our support team:\n\n📞 Phone: 9039012335\n📧 Email: support@kronop.com\n\nYou can also continue chatting with me here for immediate assistance!';
      } else {
        aiReplyText = 'Thanks for your message! Our team will get back to you soon.';
      }
      
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        text: aiReplyText,
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiReply]);
      setIsAiTyping(false);
    }, 1000);
  };

  const handleMediaSelected = (uri: string, type: 'camera' | 'gallery' | 'file' | 'drive' | 'note', metadata?: any) => {
    let mediaMessage: Message;
    
    if (type === 'file' && metadata) {
      mediaMessage = {
        id: Date.now().toString(),
        text: `📎 File attached: ${metadata.name}`,
        sender: 'user',
        mediaUri: uri,
        mediaType: type,
        mediaName: metadata.name,
      };
    } else if (type === 'drive' && metadata) {
      mediaMessage = {
        id: Date.now().toString(),
        text: `📁 Drive file created: ${metadata.name}`,
        sender: 'user',
        mediaUri: uri,
        mediaType: type,
        mediaName: metadata.name,
      };
    } else if (type === 'note' && metadata) {
      mediaMessage = {
        id: Date.now().toString(),
        text: `📝 Note created: ${metadata.title}`,
        sender: 'user',
        mediaUri: uri,
        mediaType: type,
        mediaName: metadata.title,
      };
    } else if (type === 'camera') {
      mediaMessage = {
        id: Date.now().toString(),
        text: '📸 Photo captured from camera',
        sender: 'user',
        mediaUri: uri,
        mediaType: type,
      };
    } else {
      mediaMessage = {
        id: Date.now().toString(),
        text: '🖼️ Image selected from gallery',
        sender: 'user',
        mediaUri: uri,
        mediaType: type,
      };
    }

    setMessages(prev => [...prev, mediaMessage]);
    setShowMediaModal(false);
    
    // Auto response for media
    setIsAiTyping(true);
    setTimeout(() => {
      const aiReply: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Thanks for sharing! I\'ve received your media.',
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiReply]);
      setIsAiTyping(false);
    }, 800);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.aiRow]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={isUser ? styles.userText : styles.aiText}>{item.text}</Text>
          {item.mediaUri && (
            <View style={styles.mediaIndicator}>
              <Ionicons name="attach" size={12} color={isUser ? "#E0D0F0" : "#666"} />
              <Text style={[styles.mediaText, isUser ? styles.userMediaText : styles.aiMediaText]}>
                {item.mediaName || 'Attachment'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Media option buttons for modal
  const mediaOptions = [
    { id: 'camera', title: 'Camera', icon: 'camera-outline', color: '#4A2C5F' },
    { id: 'gallery', title: 'Gallery', icon: 'images-outline', color: '#4A2C5F' },
    { id: 'files', title: 'Files', icon: 'folder-outline', color: '#4A2C5F' },
    { id: 'drive', title: 'Drive', icon: 'cloud-outline', color: '#4A2C5F' },
    { id: 'notebook', title: 'NotebookLM', icon: 'school-outline', color: '#4A2C5F' },
  ];

  const [selectedMediaType, setSelectedMediaType] = useState<string | null>(null);

  const renderMediaContent = () => {
    switch (selectedMediaType) {
      case 'camera':
        return <CameraSection onMediaSelected={(uri) => handleMediaSelected(uri, 'camera')} />;
      case 'gallery':
        return <GallerySection onImageSelected={(uri) => handleMediaSelected(uri, 'gallery')} />;
      case 'files':
        return <FilesSection onFileSelected={(file) => handleMediaSelected(file.uri, 'file', file)} />;
      case 'drive':
        return <DriveSection onFileCreated={(file) => handleMediaSelected('drive', 'drive', file)} />;
      case 'notebook':
        return <NotebookLMSection onNoteCreated={(note) => handleMediaSelected('note', 'note', note)} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['right', 'left']}>
      <StatusBar backgroundColor="#000000" barStyle="light-content" />
      
      {/* Black strip for notifications */}
      <View style={styles.blackStrip} />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Kronop Support</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Contact Buttons */}
        {showContactInfo && (
          <View style={styles.contactButtons}>
            <TouchableOpacity style={styles.contactButton}>
              <Text style={styles.contactButtonText}>📞 Call: 9039012335</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactButton}>
              <Text style={styles.contactButtonText}>📧 Email: support@kronop.com</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Typing indicator */}
        {isAiTyping && (
          <View style={styles.typingContainer}>
            <ActivityIndicator size="small" color="#4A2C5F" />
            <Text style={styles.typingText}>Typing...</Text>
          </View>
        )}

        {/* Input with Plus Icon */}
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.plusButton}
            onPress={() => setShowMediaModal(true)}
          >
            <Ionicons name="add-circle" size={32} color="#4A2C5F" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && styles.sendDisabled]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Media Selection Modal */}
        <Modal
          visible={showMediaModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowMediaModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {selectedMediaType ? 
                    mediaOptions.find(opt => opt.id === selectedMediaType)?.title : 
                    'Choose Input Method'
                  }
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    if (selectedMediaType) {
                      setSelectedMediaType(null);
                    } else {
                      setShowMediaModal(false);
                    }
                  }}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {!selectedMediaType ? (
                // Show media options grid
                <View style={styles.optionsGrid}>
                  {mediaOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.optionItem}
                      onPress={() => setSelectedMediaType(option.id)}
                    >
                      <View style={[styles.optionIcon, { backgroundColor: '#F0E8F5' }]}>
                        <Ionicons name={option.icon as any} size={32} color={option.color} />
                      </View>
                      <Text style={styles.optionTitle}>{option.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // Show selected media section
                <ScrollView style={styles.sectionContainer}>
                  {renderMediaContent()}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  blackStrip: {
    backgroundColor: '#000000',
    height: Platform.OS === 'ios' ? 44 : 24,
    width: '100%',
  },
  header: {
    backgroundColor: '#4A2C5F',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'left',
  },
  messagesList: {
    padding: 12,
  },
  messageRow: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#4A2C5F',
  },
  aiBubble: {
    backgroundColor: '#FFF',
    borderWidth: 0.5,
    borderColor: '#DDD',
  },
  userText: {
    color: '#FFF',
    fontSize: 14,
  },
  aiText: {
    color: '#000',
    fontSize: 14,
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  mediaText: {
    fontSize: 11,
    marginLeft: 4,
  },
  userMediaText: {
    color: '#E0D0F0',
  },
  aiMediaText: {
    color: '#666',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF',
  },
  typingText: {
    marginLeft: 6,
    color: '#666',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    alignItems: 'center',
    marginBottom: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  plusButton: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#4A2C5F',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    backgroundColor: '#C9B8D4',
  },
  contactButtons: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  contactButton: {
    backgroundColor: '#4A2C5F',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  contactButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  optionItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  sectionContainer: {
    padding: 16,
  },
});

export default SupportScreen;

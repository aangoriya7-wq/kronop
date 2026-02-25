import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Send, Phone, Mail, MessageCircle, Headphones, CheckCircle } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface SupportMessage {
  id: string;
  text: string;
  sender: 'user' | 'support';
  timestamp: Date;
  isTyping?: boolean;
}

export default function SupportScreen() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([
    {
      id: '1',
      text: '👋 Hello! Welcome to Kronop AI Support. I\'m here to help you with any questions or issues you might have.',
      sender: 'support',
      timestamp: new Date(),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // AI-powered response generation
  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lowerMessage = userMessage.toLowerCase();
    
    // Common support responses
    if (lowerMessage.includes('upload') || lowerMessage.includes('video')) {
      return 'For upload issues, make sure you have a stable internet connection and the video format is supported (MP4, MOV). Try clearing app cache if the problem persists.';
    } else if (lowerMessage.includes('login') || lowerMessage.includes('account')) {
      return 'For login issues, try resetting your password using the "Forgot Password" option. Make sure you\'re using the correct email address.';
    } else if (lowerMessage.includes('payment') || lowerMessage.includes('money')) {
      return 'For payment-related queries, please check your payment method details and ensure sufficient funds. Contact your bank if the issue persists.';
    } else if (lowerMessage.includes('bug') || lowerMessage.includes('error')) {
      return 'I apologize for the inconvenience. Could you please provide more details about the error you\'re experiencing? This will help me assist you better.';
    } else if (lowerMessage.includes('contact') || lowerMessage.includes('phone') || lowerMessage.includes('email')) {
      return 'You can reach our human support team at:\n📧 Email: support@kronop.com\n📞 Phone: +1-800-KRONOP\n🕐 Available: 9 AM - 6 PM EST';
    } else {
      return 'Thank you for your message. I understand your concern and I\'m here to help. Could you provide more details so I can assist you better?';
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage: SupportMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    // Add typing indicator
    const typingMessage: SupportMessage = {
      id: 'typing-' + Date.now(),
      text: '',
      sender: 'support',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const aiResponse = await generateAIResponse(message);
      
      // Remove typing indicator and add AI response
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== typingMessage.id);
        return [
          ...filtered,
          {
            id: 'ai-' + Date.now(),
            text: aiResponse,
            sender: 'support',
            timestamp: new Date(),
          }
        ];
      });
    } catch (error) {
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== typingMessage.id);
        return [
          ...filtered,
          {
            id: 'error-' + Date.now(),
            text: 'Sorry, I encountered an error. Please try again or contact our human support team.',
            sender: 'support',
            timestamp: new Date(),
          }
        ];
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleContactSupport = () => {
    Alert.alert(
      'Contact Human Support',
      'Choose your preferred contact method:',
      [
        {
          text: '📧 Email Us',
          onPress: () => {
            // Open email client
            Alert.alert('Email Support', 'Please email us at: support@kronop.com');
          },
        },
        {
          text: '📞 Call Us',
          onPress: () => {
            Alert.alert('Phone Support', 'Please call us at: +1-800-KRONOP\n\nAvailable: 9 AM - 6 PM EST');
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const renderMessage = (msg: SupportMessage) => {
    const isUser = msg.sender === 'user';
    
    if (msg.isTyping) {
      return (
        <View className="flex-row items-start mb-3">
          <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-2">
            <Headphones size={16} color="#8B5CF6" />
          </View>
          <View className="bg-gray-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[70%]">
            <View className="flex-row items-center">
              <Text className="text-gray-500 text-sm animate-pulse">AI is typing</Text>
              <View className="flex-row ml-2">
                <View className="w-2 h-2 bg-gray-400 rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '0ms' }} />
                <View className="w-2 h-2 bg-gray-400 rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '150ms' }} />
                <View className="w-2 h-2 bg-gray-400 rounded-full mx-0.5 animate-bounce" style={{ animationDelay: '300ms' }} />
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View className={`flex-row items-start mb-3 ${isUser ? 'justify-end' : ''}`}>
        {!isUser && (
          <View className="w-8 h-8 rounded-full bg-purple-100 items-center justify-center mr-2">
            <Headphones size={16} color="#8B5CF6" />
          </View>
        )}
        
        <View className={`max-w-[70%] rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-purple-600 text-white rounded-tr-none' 
            : 'bg-gray-100 text-gray-800 rounded-tl-none'
        }`}>
          <Text className={`text-sm ${isUser ? 'text-white' : 'text-gray-800'}`}>
            {msg.text}
          </Text>
          <Text className={`text-xs mt-1 ${isUser ? 'text-purple-200' : 'text-gray-500'}`}>
            {msg.timestamp.toLocaleTimeString()}
          </Text>
        </View>
        
        {isUser && (
          <View className="w-8 h-8 rounded-full bg-purple-600 items-center justify-center ml-2">
            <Text className="text-white text-xs font-bold">U</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Professional Header */}
        <View className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-4 shadow-lg">
          <Text className="text-white text-xl font-bold text-center">
            🎧 Kronop AI Support
          </Text>
          <Text className="text-purple-100 text-sm text-center mt-1">
            We're here to help 24/7
          </Text>
        </View>

        {/* User Info Section */}
        <View className="bg-purple-50 mx-4 mt-4 p-4 rounded-xl">
          <Text className="text-gray-700 font-semibold mb-3">Your Information</Text>
          
          <View className="space-y-3">
            <View>
              <Text className="text-gray-600 text-sm mb-1">Name</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                placeholder="Enter your name"
                value={userInfo.name}
                onChangeText={(text) => setUserInfo(prev => ({ ...prev, name: text }))}
              />
            </View>
            
            <View>
              <Text className="text-gray-600 text-sm mb-1">Email</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                placeholder="your@email.com"
                value={userInfo.email}
                onChangeText={(text) => setUserInfo(prev => ({ ...prev, email: text }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View>
              <Text className="text-gray-600 text-sm mb-1">Phone (Optional)</Text>
              <TextInput
                className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-800"
                placeholder="+1 (555) 123-4567"
                value={userInfo.phone}
                onChangeText={(text) => setUserInfo(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* Chat Messages */}
        <ScrollView 
          className="flex-1 px-4 py-4"
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
        </ScrollView>

        {/* Contact Support Buttons */}
        <View className="px-4 py-3 bg-gray-50">
          <View className="flex-row justify-around mb-3">
            <TouchableOpacity
              className="bg-red-500 px-4 py-2 rounded-lg flex-row items-center"
              onPress={handleContactSupport}
            >
              <Phone size={16} color="white" className="mr-2" />
              <Text className="text-white font-semibold">Call Support</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
              onPress={handleContactSupport}
            >
              <Mail size={16} color="white" className="mr-2" />
              <Text className="text-white font-semibold">Email Us</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Message Input */}
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2">
            <TextInput
              className="flex-1 text-gray-800 mr-3"
              placeholder="Type your message here..."
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={500}
              textAlignVertical="center"
            />
            
            <TouchableOpacity
              className={`w-10 h-10 rounded-full items-center justify-center ${
                message.trim() ? 'bg-purple-600' : 'bg-gray-400'
              }`}
              onPress={handleSendMessage}
              disabled={!message.trim() || isTyping}
            >
              <Send size={18} color="white" />
            </TouchableOpacity>
          </View>
          
          {message.length > 400 && (
            <Text className="text-gray-500 text-xs mt-1 text-center">
              {message.length}/500 characters
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

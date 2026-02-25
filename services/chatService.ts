import { API_BASE_URL } from '../constants/network';

const API_URL = API_BASE_URL;

export interface Message {
  id?: string;
  text: string;
  senderId: string;
  createdAt: any;
  user?: {
    _id: string;
    avatar: string;
  };
}

export const chatService = {
  // List conversations for a user
  getConversations: async (userId: string) => {
    try {
      // TODO: Implement real conversation fetching
      // Migration to Supabase/MongoDB Chat in progress.
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  // Create or get existing chat between users
  createChat: async (currentUserId: string, otherUserId: string) => {
    try {
      return { id: 'temp-chat-id', participants: [currentUserId, otherUserId] };
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  },

  // Send a message
  sendMessage: async (chatId: string, senderId: string, text: string, senderDetails?: any) => {
    try {
      // Trigger Notification via Backend API if needed
      try {
        await fetch(`${API_URL}/chat/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, senderId, lastMessage: text })
        });
      } catch (_e) {
        // swallow sync errors
      }
      return { success: true };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // Subscribe to real-time messages
  subscribeToMessages: (chatId: string, callback: (messages: Message[]) => void) => {
    // Return an empty unsubscribe function
    return () => {};
  }
};

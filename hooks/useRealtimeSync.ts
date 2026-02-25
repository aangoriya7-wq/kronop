import { useEffect, useState, useCallback } from 'react';
import websocketService from '../services/websocketService';

interface SyncStatus {
  isConnected: boolean;
  isConnecting: boolean;
  lastSync?: string;
  newItemsCount?: number;
}

interface NewContentItem {
  id: string;
  title: string;
  type: string;
  thumbnail: string;
  url: string;
  createdAt: string;
}

interface NewContentData {
  contentType: string;
  newItemsCount: number;
  items: NewContentItem[];
}

export const useRealtimeSync = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isConnected: false,
    isConnecting: false
  });
  
  const [newContent, setNewContent] = useState<NewContentData | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string>('');

  // Update connection status
  const updateConnectionStatus = useCallback(() => {
    const status = websocketService.getConnectionStatus();
    setSyncStatus(prev => ({
      ...prev,
      isConnected: status.isConnected,
      isConnecting: status.isConnecting
    }));
  }, []);

  // Handle new content updates
  const handleNewContent = useCallback((data: NewContentData) => {
    setNewContent(data);
    
    // You can trigger app refresh here
    if (data.newItemsCount > 0) {
      // Show notification or update UI
    }
  }, []);

  // Handle sync updates
  const handleSyncUpdate = useCallback((data: any) => {
    setSyncStatus(prev => ({
      ...prev,
      lastSync: data.lastSync,
      newItemsCount: data.newItemsCount
    }));
  }, []);

  // Handle connection events
  const handleConnection = useCallback((data: any) => {
    setConnectionMessage(data.message || '');
  }, []);

  // Initialize WebSocket connection
  const connect = useCallback(async () => {
    try {
      setSyncStatus(prev => ({ ...prev, isConnecting: true }));
      await websocketService.connect();
      updateConnectionStatus();
    } catch (error) {
      console.error('❌ Failed to connect to WebSocket:', error);
      setSyncStatus(prev => ({ ...prev, isConnecting: false }));
    }
  }, [updateConnectionStatus]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    updateConnectionStatus();
  }, [updateConnectionStatus]);

  // Setup event listeners and connection
  useEffect(() => {
    // Add event listeners
    websocketService.onNewContent(handleNewContent);
    websocketService.onSyncUpdate(handleSyncUpdate);
    websocketService.onConnection(handleConnection);

    // Connect to WebSocket
    connect();

    // Cleanup on unmount
    return () => {
      websocketService.removeEventListener('new_content', handleNewContent);
      websocketService.removeEventListener('sync_update', handleSyncUpdate);
      websocketService.removeEventListener('connection', handleConnection);
      disconnect();
    };
  }, [connect, disconnect, handleNewContent, handleSyncUpdate, handleConnection]);

  // Manual refresh trigger
  const triggerRefresh = useCallback(() => {
    // This can be called from UI to refresh content
    // You can call your existing content refresh functions here
  }, []);

  // Clear new content notification
  const clearNewContentNotification = useCallback(() => {
    setNewContent(null);
  }, []);

  return {
    // Connection status
    isConnected: syncStatus.isConnected,
    isConnecting: syncStatus.isConnecting,
    connectionMessage,
    
    // Sync status
    lastSync: syncStatus.lastSync,
    newItemsCount: syncStatus.newItemsCount,
    
    // New content
    newContent,
    hasNewContent: newContent && newContent.newItemsCount > 0,
    
    // Actions
    triggerRefresh,
    clearNewContentNotification,
    
    // Manual connection control
    connect,
    disconnect
  };
};

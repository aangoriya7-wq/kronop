// ==================== REAL-TIME SYNC HOOK ====================
// React Hook for Real-time WebSocket Sync Integration
// Provides real-time data updates without polling

import { useEffect, useState, useCallback, useRef } from 'react';
// import { realtimeSyncService, RealtimeEvent, SyncResult } from '../services/autoSyncService'; // Service removed

// Mock types since service is removed
export interface RealtimeEvent {
  type: string;
  contentType: string;
  data: any;
  timestamp: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  cleaned: number;
  errors: string[];
  lastSync: string;
}

// Mock service since real service is removed
const mockRealtimeSyncService = {
  start: () => console.log('Mock: AutoSync started'),
  stop: () => console.log('Mock: AutoSync stopped'),
  on: (event: string, handler: Function) => console.log('Mock: Event listener added'),
  off: (event: string, handler: Function) => console.log('Mock: Event listener removed'),
  isReady: () => false,
  getStatus: () => ({
    success: false,
    synced: 0,
    cleaned: 0,
    errors: ['Service removed'],
    lastSync: new Date().toISOString()
  })
};

export interface UseRealtimeSyncOptions {
  autoStart?: boolean;
  onContentAdded?: (event: RealtimeEvent) => void;
  onContentUpdated?: (event: RealtimeEvent) => void;
  onContentDeleted?: (event: RealtimeEvent) => void;
  onConnectionChange?: (isConnected: boolean) => void;
  onError?: (error: string) => void;
}

export interface UseRealtimeSyncReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionStatus: SyncResult;
  start: () => void;
  stop: () => void;
  eventCount: number;
}

/**
 * Real-time Sync Hook - React Integration for WebSocket Sync
 * 
 * @param options - Configuration options
 * @returns Real-time sync controls and status
 */
export const useRealtimeSync = (options: UseRealtimeSyncOptions = {}): UseRealtimeSyncReturn => {
  const {
    autoStart = true,
    onContentAdded,
    onContentUpdated,
    onContentDeleted,
    onConnectionChange,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<SyncResult>({
    success: false,
    synced: 0,
    cleaned: 0,
    errors: [],
    lastSync: new Date().toISOString()
  });
  const [eventCount, setEventCount] = useState(0);

  const serviceRef = useRef(mockRealtimeSyncService);
  const eventHandlersRef = useRef<Map<string, (event: RealtimeEvent) => void>>(new Map());

  /**
   * Update connection status from service
   */
  const updateStatus = useCallback(() => {
    const status = serviceRef.current.getStatus();
    const connected = serviceRef.current.isReady();
    
    setConnectionStatus(status);
    setIsConnected(connected);
    
    if (onConnectionChange) {
      onConnectionChange(connected);
    }
    
    if (!connected && status.errors.length > 0 && onError) {
      onError(status.errors.join(', '));
    }
  }, [onConnectionChange, onError]);

  /**
   * Handle content added event
   */
  const handleContentAdded = useCallback((event: RealtimeEvent) => {
    console.log(`[REALTIME_HOOK]: Content added - ${event.contentType}:${event.data.id}`);
    setEventCount(prev => prev + 1);
    
    if (onContentAdded) {
      onContentAdded(event);
    }
  }, [onContentAdded]);

  /**
   * Handle content updated event
   */
  const handleContentUpdated = useCallback((event: RealtimeEvent) => {
    console.log(`[REALTIME_HOOK]: Content updated - ${event.contentType}:${event.data.id}`);
    setEventCount(prev => prev + 1);
    
    if (onContentUpdated) {
      onContentUpdated(event);
    }
  }, [onContentUpdated]);

  /**
   * Handle content deleted event
   */
  const handleContentDeleted = useCallback((event: RealtimeEvent) => {
    console.log(`[REALTIME_HOOK]: Content deleted - ${event.contentType}:${event.data.id}`);
    setEventCount(prev => prev + 1);
    
    if (onContentDeleted) {
      onContentDeleted(event);
    }
  }, [onContentDeleted]);

  /**
   * Start real-time sync service
   */
  const start = useCallback(() => {
    if (isConnected) return;
    
    try {
      setIsConnecting(true);
      serviceRef.current.start();
      console.log('[REALTIME_HOOK]: Started real-time sync');
    } catch (error) {
      console.error('[REALTIME_HOOK]: Failed to start:', error);
      setIsConnecting(false);
      if (onError) {
        onError(error instanceof Error ? error.message : String(error));
      }
    }
  }, [isConnected, onError]);

  /**
   * Stop real-time sync service
   */
  const stop = useCallback(() => {
    try {
      serviceRef.current.stop();
      setIsConnected(false);
      setIsConnecting(false);
      console.log('[REALTIME_HOOK]: Stopped real-time sync');
    } catch (error) {
      console.error('[REALTIME_HOOK]: Failed to stop:', error);
      if (onError) {
        onError(error instanceof Error ? error.message : String(error));
      }
    }
  }, [onError]);

  /**
   * Initialize event listeners
   */
  useEffect(() => {
    const service = serviceRef.current;
    const handlers = eventHandlersRef.current;

    // Set up event listeners
    handlers.set('content_added', handleContentAdded);
    handlers.set('content_updated', handleContentUpdated);
    handlers.set('content_deleted', handleContentDeleted);

    // Register listeners with service
    service.on('content_added', handleContentAdded);
    service.on('content_updated', handleContentUpdated);
    service.on('content_deleted', handleContentDeleted);

    // Cleanup function
    return () => {
      service.off('content_added', handleContentAdded);
      service.off('content_updated', handleContentUpdated);
      service.off('content_deleted', handleContentDeleted);
    };
  }, [handleContentAdded, handleContentUpdated, handleContentDeleted]);

  /**
   * Auto-start on mount - no polling
   */
  useEffect(() => {
    if (autoStart) {
      start();
    }

    // Cleanup on unmount
    return () => {
      stop();
    };
  }, [autoStart, start, stop]);

  return {
    isConnected,
    isConnecting,
    connectionStatus,
    start,
    stop,
    eventCount
  };
};

/**
   * Background Real-time Sync Hook - Pure Push Mode
   * No polling, only receives server push notifications
   */
export const useBackgroundRealtimeSync = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const sync = useRealtimeSync({
    autoStart: true,
    onConnectionChange: (connected) => {
      setIsConnected(connected);
    },
    onContentAdded: (event) => {
      setLastEvent(event);
    },
    onContentUpdated: (event) => {
      setLastEvent(event);
    },
    onContentDeleted: (event) => {
      setLastEvent(event);
    },
    onError: (error) => {
      // Silent error handling
    }
  });

  return {
    isConnected,
    lastEvent,
    eventCount: sync.eventCount,
    isReady: sync.isConnected
  };
};

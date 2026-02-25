import { API_BASE_URL } from '../constants/network';

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp: string;
}

interface SyncUpdateData {
  status: string;
  newItemsCount: number;
  lastSync: string;
}

interface NewContentData {
  contentType: string;
  newItemsCount: number;
  items: {
    id: string;
    title: string;
    type: string;
    thumbnail: string;
    url: string;
    createdAt: string;
  }[];
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private isConnecting = false;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize default listeners
    this.listeners.set('connection', []);
    this.listeners.set('new_content', []);
    this.listeners.set('sync_update', []);
    this.listeners.set('general_update', []);
    this.listeners.set('pong', []);
  }

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        // Convert HTTP URL to WebSocket URL
        const wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
        const wsPort = wsUrl.includes(':3000') ? ':3000' : '';
        const wsServerUrl = `ws://10.19.116.51${wsPort}`;

        console.log('🔌 Connecting to WebSocket:', wsServerUrl);
        
        this.ws = new WebSocket(wsServerUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          
          // Start ping interval
          this.startPingInterval();
          
          // Subscribe to all updates
          this.subscribe(['all']);
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('📨 WebSocket message:', message);
            
            // Notify listeners
            const messageListeners = this.listeners.get(message.type);
            if (messageListeners) {
              messageListeners.forEach(callback => {
                try {
                  callback(message.data || message);
                } catch (error) {
                  console.error('❌ Error in WebSocket listener:', error);
                }
              });
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.isConnecting = false;
          this.stopPingInterval();
          
          // Attempt to reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            
            setTimeout(() => {
              this.connect().catch(error => {
                console.error('❌ Reconnection failed:', error);
              });
            }, this.reconnectInterval);
          } else {
            console.error('❌ Max reconnection attempts reached');
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket server
  disconnect() {
    if (this.ws) {
      this.stopPingInterval();
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  // Send message to server
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }

  // Subscribe to specific update channels
  subscribe(channels: string[]) {
    this.send({
      type: 'subscribe',
      channels
    });
  }

  // Send ping to server
  ping() {
    this.send({
      type: 'ping',
      timestamp: new Date().toISOString()
    });
  }

  // Start ping interval
  private startPingInterval() {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      this.ping();
    }, 25000) as unknown as NodeJS.Timeout; // Type assertion for Node.js environment
  }

  // Stop ping interval
  private stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Add event listener
  addEventListener(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  // Remove event listener
  removeEventListener(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.ws?.readyState === WebSocket.OPEN,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  // Convenience method for new content updates
  onNewContent(callback: (data: NewContentData) => void) {
    this.addEventListener('new_content', callback);
  }

  // Convenience method for sync updates
  onSyncUpdate(callback: (data: SyncUpdateData) => void) {
    this.addEventListener('sync_update', callback);
  }

  // Convenience method for general updates
  onGeneralUpdate(callback: (data: any) => void) {
    this.addEventListener('general_update', callback);
  }

  // Convenience method for connection events
  onConnection(callback: (data: any) => void) {
    this.addEventListener('connection', callback);
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;

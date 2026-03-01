/**
 * WebTransport Service for Unbreakable Server-App Connection
 * 
 * This service provides a robust connection layer using WebTransport API
 * with automatic reconnection, connection pooling, and fallback mechanisms.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface WebTransportConfig {
  serverUrl: string;
  enableReconnection: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  connectionTimeout: number;
  keepAliveInterval: number;
  enableCompression: boolean;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  connectedAt: number | null;
  lastError: string | null;
  reconnectAttempts: number;
  totalUptime: number;
  bytesReceived: number;
  bytesSent: number;
}

export interface MessageQueue {
  pending: any[];
  sent: Map<string, { timestamp: number; message: any }>;
  failed: any[];
}

class WebTransportService {
  private config: WebTransportConfig;
  private transport: any = null; // WebTransport instance
  private streams: Map<string, any> = new Map(); // Bidirectional streams
  private connectionState: ConnectionState;
  private messageQueue: MessageQueue;
  private eventListeners: Map<string, Function[]> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private messageId = 0;

  constructor(config: WebTransportConfig) {
    this.config = { ...config };

    this.connectionState = {
      status: 'disconnected',
      connectedAt: null,
      lastError: null,
      reconnectAttempts: 0,
      totalUptime: 0,
      bytesReceived: 0,
      bytesSent: 0,
    };

    this.messageQueue = {
      pending: [],
      sent: new Map(),
      failed: [],
    };

    // Setup network monitoring
    this.setupNetworkMonitoring();
  }

  /**
   * Connect to server using WebTransport
   */
  async connect(): Promise<boolean> {
    try {
      this.updateConnectionState('connecting');
      
      // Create WebTransport connection
      const transportUrl = this.config.serverUrl.replace('http', 'https');
      
      // Check if WebTransport is available
      if (typeof WebTransport === 'undefined') {
        // Fallback to WebSocket for React Native
        return await this.connectWebSocketFallback();
      }

      this.transport = new WebTransport(transportUrl, {
        requireUnreliable: false,
        serverCertificateHashes: [], // Add certificate hashes if needed
      });

      // Wait for connection with timeout
      const connectionPromise = this.transport.ready;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), this.config.connectionTimeout);
      });

      await Promise.race([connectionPromise, timeoutPromise]);

      // Connection successful
      this.updateConnectionState('connected');
      this.connectionState.connectedAt = Date.now();
      this.connectionState.reconnectAttempts = 0;

      // Setup message handlers
      this.setupMessageHandlers();

      // Start keep-alive
      this.startKeepAlive();

      // Process queued messages
      this.processMessageQueue();

      this.emit('connected', { state: this.connectionState });
      return true;

    } catch (error: any) {
      this.updateConnectionState('error');
      this.connectionState.lastError = error.message || 'Unknown error';
      
      this.emit('connectionError', { error: error.message || 'Unknown error', state: this.connectionState });
      
      // Attempt reconnection if enabled
      if (this.config.enableReconnection) {
        this.scheduleReconnect();
      }
      
      return false;
    }
  }

  /**
   * WebSocket fallback for React Native
   */
  private async connectWebSocketFallback(): Promise<boolean> {
    try {
      const WebSocket = require('ws'); // or appropriate WebSocket library for React Native
      const wsUrl = this.config.serverUrl.replace('https', 'wss').replace('http', 'ws');
      
      this.transport = new WebSocket(wsUrl);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, this.config.connectionTimeout);

        this.transport.on('open', () => {
          clearTimeout(timeout);
          this.updateConnectionState('connected');
          this.connectionState.connectedAt = Date.now();
          this.setupWebSocketMessageHandlers();
          this.startKeepAlive();
          this.processMessageQueue();
          this.emit('connected', { state: this.connectionState });
          resolve(true);
        });

        this.transport.on('error', (error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error: any) {
      throw new Error(`WebSocket fallback failed: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Create bidirectional stream for specific purpose
   */
  async createStream(streamId: string, purpose: string): Promise<boolean> {
    try {
      if (!this.transport || this.connectionState.status !== 'connected') {
        throw new Error('Not connected');
      }

      let stream;
      
      if (this.transport instanceof WebSocket) {
        // WebSocket doesn't support multiple streams, use single connection
        stream = this.transport;
      } else {
        // WebTransport bidirectional stream
        stream = await this.transport.createBidirectionalStream();
      }

      this.streams.set(streamId, {
        stream,
        purpose,
        createdAt: Date.now(),
        messagesSent: 0,
        messagesReceived: 0,
      });

      this.emit('streamCreated', { streamId, purpose });
      return true;

    } catch (error: any) {
      this.emit('streamError', { streamId, error: error.message || 'Unknown error' });
      return false;
    }
  }

  /**
   * Send message through WebTransport
   */
  async sendMessage(message: any, streamId?: string): Promise<boolean> {
    try {
      if (this.connectionState.status !== 'connected') {
        // Queue message if not connected
        this.messageQueue.pending.push({ ...message, timestamp: Date.now() });
        return false;
      }

      const messageId = this.generateMessageId();
      const messageWithId = {
        id: messageId,
        timestamp: Date.now(),
        ...message,
      };

      let targetStream = streamId ? this.streams.get(streamId)?.stream : this.transport;

      if (!targetStream) {
        throw new Error('No stream available');
      }

      // Compress message if enabled
      let messageData = JSON.stringify(messageWithId);
      if (this.config.enableCompression) {
        messageData = await this.compressMessage(messageData);
      }

      // Send message
      if (targetStream instanceof WebSocket) {
        targetStream.send(messageData);
      } else {
        const writer = targetStream.writable.getWriter();
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(messageData));
        writer.releaseLock();
      }

      // Track message
      this.messageQueue.sent.set(messageId, {
        timestamp: Date.now(),
        message: messageWithId,
      });

      this.connectionState.bytesSent += messageData.length;
      this.emit('messageSent', { messageId, message: messageWithId });

      return true;

    } catch (error: any) {
      this.messageQueue.failed.push({ ...message, error: error.message || 'Unknown error' });
      this.emit('messageError', { error: error.message || 'Unknown error', message });
      return false;
    }
  }

  /**
   * Send message with acknowledgment
   */
  async sendMessageWithAck(message: any, timeout: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      const messageWithAck = {
        ...message,
        id: messageId,
        requireAck: true,
      };

      // Set up timeout
      const timeoutTimer = setTimeout(() => {
        this.off(`ack_${messageId}`, ackHandler);
        reject(new Error('Message acknowledgment timeout'));
      }, timeout) as any;

      // Set up acknowledgment handler
      const ackHandler = (ack: any) => {
        clearTimeout(timeoutTimer);
        this.off(`ack_${messageId}`, ackHandler);
        resolve(ack);
      };

      this.on(`ack_${messageId}`, ackHandler);

      // Send message
      this.sendMessage(messageWithAck);
    });
  }

  /**
   * Get connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState.status === 'connected';
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    try {
      // Clear timers
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer);
        this.keepAliveTimer = null;
      }
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }

      // Close all streams
      for (const [streamId, streamData] of this.streams) {
        try {
          if (streamData.stream.close) {
            await streamData.stream.close();
          }
        } catch (error) {
          console.error(`Error closing stream ${streamId}:`, error);
        }
      }
      this.streams.clear();

      // Close transport
      if (this.transport) {
        if (this.transport.close) {
          await this.transport.close();
        } else if (this.transport.terminate) {
          this.transport.terminate();
        }
        this.transport = null;
      }

      // Update state
      this.updateConnectionState('disconnected');
      this.emit('disconnected', { state: this.connectionState });

    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Private methods

  private updateConnectionState(status: ConnectionState['status']): void {
    const oldStatus = this.connectionState.status;
    this.connectionState.status = status;

    if (status === 'connected' && oldStatus !== 'connected') {
      this.connectionState.connectedAt = Date.now();
    } else if (status === 'disconnected' && oldStatus === 'connected') {
      // Calculate uptime
      if (this.connectionState.connectedAt) {
        this.connectionState.totalUptime += Date.now() - this.connectionState.connectedAt;
      }
    }

    this.emit('stateChanged', { oldStatus, newStatus: status, state: this.connectionState });
  }

  private setupMessageHandlers(): void {
    if (!this.transport) return;

    if (this.transport instanceof WebSocket) {
      this.setupWebSocketMessageHandlers();
    } else {
      // WebTransport message handling
      const reader = this.transport.datagrams.readable.getReader();
      const decoder = new TextDecoder();

      const processDatagrams = async () => {
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            try {
              const message = JSON.parse(decoder.decode(value));
              this.handleIncomingMessage(message);
            } catch (error) {
              console.error('Failed to parse message:', error);
            }
          }
        } catch (error) {
          console.error('Error reading datagrams:', error);
          this.handleConnectionError(error);
        }
      };

      processDatagrams();
    }
  }

  private setupWebSocketMessageHandlers(): void {
    if (!this.transport) return;

    this.transport.on('message', (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleIncomingMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    this.transport.on('close', () => {
      this.handleConnectionError(new Error('WebSocket closed'));
    });

    this.transport.on('error', (error: any) => {
      this.handleConnectionError(error);
    });
  }

  private handleIncomingMessage(message: any): void {
    this.connectionState.bytesReceived += JSON.stringify(message).length;

    // Handle acknowledgment
    if (message.ack) {
      this.emit(`ack_${message.messageId}`, message);
      return;
    }

    // Send acknowledgment if required
    if (message.requireAck) {
      this.sendMessage({
        ack: true,
        messageId: message.id,
        timestamp: Date.now(),
      });
    }

    // Emit message to listeners
    this.emit('message', message);
    this.emit(message.type || 'unknown', message);
  }

  private handleConnectionError(error: any): void {
    this.updateConnectionState('error');
    this.connectionState.lastError = error.message;
    
    this.emit('connectionError', { error: error.message, state: this.connectionState });

    // Attempt reconnection if enabled
    if (this.config.enableReconnection) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.connectionState.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('reconnectFailed', { attempts: this.connectionState.reconnectAttempts });
      return;
    }

    this.updateConnectionState('reconnecting');
    this.connectionState.reconnectAttempts++;

    const delay = this.config.reconnectDelay * Math.pow(2, this.connectionState.reconnectAttempts - 1);

    this.reconnectTimer = setTimeout(async () => {
      this.emit('reconnecting', { attempt: this.connectionState.reconnectAttempts });
      
      const success = await this.connect();
      if (!success) {
        // Reconnect failed, will schedule next attempt
        this.scheduleReconnect();
      }
    }, delay) as any;
  }

  private startKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
    }

    this.keepAliveTimer = setInterval(() => {
      this.sendMessage({
        type: 'keepalive',
        timestamp: Date.now(),
      });
    }, this.config.keepAliveInterval) as any;

    // Start ping for latency measurement
    this.pingTimer = setInterval(() => {
      this.measureLatency();
    }, 10000) as any;
  }

  private async measureLatency(): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.sendMessageWithAck({
        type: 'ping',
        timestamp: startTime,
      }, 3000);

      const latency = Date.now() - startTime;
      this.emit('latencyMeasured', { latency });
    } catch (error: any) {
      this.emit('pingFailed', { error: error.message || 'Unknown error' });
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.pending.length > 0) {
      const message = this.messageQueue.pending.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener((state: any) => {
      if (!state.isConnected) {
        this.handleConnectionError(new Error('Network disconnected'));
      } else if (this.connectionState.status === 'disconnected') {
        // Network restored, attempt reconnection
        this.connect();
      }
    });
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageId}`;
  }

  private async compressMessage(message: string): Promise<string> {
    // Simple compression simulation
    // In production, use proper compression library
    return message;
  }

  private async decompressMessage(message: string): Promise<string> {
    // Simple decompression simulation
    // In production, use proper decompression library
    return message;
  }
}

export default WebTransportService;

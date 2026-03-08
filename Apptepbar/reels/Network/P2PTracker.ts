import { EventEmitter } from 'events';

export interface PeerNode {
  id: string;
  endpoint: string;
  region: string;
  bandwidth: number; // Mbps
  latency: number; // ms
  lastSeen: Date;
  isActive: boolean;
  chunks: Map<string, ChunkInfo>;
}

export interface ChunkInfo {
  id: string;
  videoId: string;
  checksum: string;
  size: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  sourcePeers: string[];
  createdAt: Date;
  ttl: number; // Time to live in seconds
}

export interface WebRTCOffer {
  offerId: string;
  fromNodeId: string;
  toNodeId: string;
  sdp: string;
  chunks: ChunkInfo[];
  timestamp: Date;
  signature?: string; // For verification
  type: 'offer' | 'answer';
}

export interface P2PConfig {
  maxPeers: number;
  chunkSize: number;
  connectionTimeout: number;
  heartbeatInterval: number;
  enableEncryption: boolean;
  enableCompression: boolean;
  regionPreference: string;
  iceServers: RTCIceServer[];
}

export class P2PTracker extends EventEmitter {
  private config: P2PConfig;
  private localNodeId: string;
  private peers: Map<string, PeerNode> = new Map();
  private connections: Map<string, RTCPeerConnection> = new Map();
  private chunkInventory: Map<string, ChunkInfo> = new Map();
  private activeOffers: Map<string, WebRTCOffer> = new Map();
  private networkStats: NetworkStatistics;
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private discoveryInterval?: ReturnType<typeof setInterval>;

  constructor(localNodeId: string, config: P2PConfig) {
    super();
    this.localNodeId = localNodeId;
    this.config = config;
    this.networkStats = new NetworkStatistics(localNodeId);
    
    console.log(`🌐 P2P Tracker initialized for node: ${localNodeId}`);
  }

  /**
   * Initialize P2P network with WebRTC
   */
  async initializeNetwork(): Promise<void> {
    console.log('🚀 Initializing P2P WebRTC Network');
    
    try {
      // Start peer discovery
      await this.startPeerDiscovery();
      
      // Start connection management
      this.startConnectionManager();
      
      // Start heartbeat service
      this.startHeartbeatService();
      
      // Start chunk sharing service
      this.startChunkSharing();
      
      console.log('✅ P2P Network initialized successfully');
      this.emit('networkInitialized', { nodeId: this.localNodeId });
    } catch (error) {
      console.error('❌ Failed to initialize P2P network:', error);
      throw error;
    }
  }

  /**
   * Node Discovery: Find and connect to nearby peers
   */
  private async startPeerDiscovery(): Promise<void> {
    console.log('🔍 Starting peer discovery...');
    
    // Simulate peer discovery (in production, use STUN/TURN servers)
    const discoveredPeers: PeerNode[] = [
      {
        id: 'peer_1',
        endpoint: '192.168.1.100:8080',
        region: 'us-west',
        bandwidth: 20, // 20 Mbps
        latency: 30, // 30ms
        lastSeen: new Date(),
        isActive: true,
        chunks: new Map(),
      },
      {
        id: 'peer_2',
        endpoint: '192.168.1.101:8080',
        region: 'eu-west',
        bandwidth: 15, // 15 Mbps
        latency: 40, // 40ms
        lastSeen: new Date(),
        isActive: true,
        chunks: new Map(),
      },
      {
        id: 'peer_3',
        endpoint: '192.168.1.102:8080',
        region: 'asia-east',
        bandwidth: 25, // 25 Mbps
        latency: 25, // 25ms
        lastSeen: new Date(),
        isActive: true,
        chunks: new Map(),
      },
    ];

    // Connect to discovered peers
    for (const peer of discoveredPeers) {
      if (peer.id !== this.localNodeId) {
        await this.connectToPeer(peer);
      }
    }

    console.log(`✅ Discovered and connected to ${discoveredPeers.length} peers`);
  }

  /**
   * Connect to peer using WebRTC offer/answer
   */
  private async connectToPeer(peerNode: PeerNode): Promise<void> {
    console.log(`🤝 Connecting to peer: ${peerNode.id} (${peerNode.endpoint})`);
    
    try {
      // Create WebRTC connection
      const peerConnection = new RTCPeerConnection({
        iceServers: this.config.iceServers,
      });

      // Store connection
      this.connections.set(peerNode.id, peerConnection);

      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const webRTCOffer: WebRTCOffer = {
        offerId: `${this.localNodeId}_${peerNode.id}_${Date.now()}`,
        fromNodeId: this.localNodeId,
        toNodeId: peerNode.id,
        sdp: offer.sdp!,
        chunks: [], // Empty for initial connection
        timestamp: new Date(),
        type: 'offer',
      };

      // Send offer to peer (in production, this would use signaling server)
      await this.sendOfferToPeer(peerNode.id, webRTCOffer);

      // Handle answer
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`🧊 ICE Candidate for peer ${peerNode.id}:`, event.candidate);
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log(`🔗 Connection state with ${peerNode.id}:`, peerConnection.connectionState);
        
        if (peerConnection.connectionState === 'connected') {
          this.networkStats.addConnection(peerNode);
          this.emit('peerConnected', { peerId: peerNode.id, peerNode });
        }
      };

      console.log(`✅ WebRTC connection initiated to peer: ${peerNode.id}`);
    } catch (error) {
      console.error(`❌ Failed to connect to peer ${peerNode.id}:`, error);
    }
  }

  /**
   * Handle WebRTC offer/answer logic for P2P communication
   */
  async handleWebRTCHandshake(offerId: string, answerData: RTCSessionDescriptionInit): Promise<void> {
    console.log(`🤝 Processing WebRTC handshake for offer: ${offerId}`);
    
    try {
      const offer = this.activeOffers.get(offerId);
      if (!offer) {
        throw new Error(`Offer ${offerId} not found`);
      }

      // Create answer
      const peerConnection = this.connections.get(offer.fromNodeId);
      if (!peerConnection) {
        throw new Error(`No connection found for peer ${offer.fromNodeId}`);
      }

      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer(answerData);
      await peerConnection.setLocalDescription(answer);

      // Send answer back
      await this.sendAnswerToPeer(offer.fromNodeId, answer);

      console.log(`✅ WebRTC handshake completed for offer: ${offerId}`);
      this.emit('handshakeCompleted', { offerId, fromPeer: offer.fromNodeId });
    } catch (error) {
      console.error(`❌ WebRTC handshake failed:`, error);
    }
  }

  /**
   * Share chunk metadata with peers
   */
  async shareChunkMetadata(chunkMetadata: ChunkInfo): Promise<void> {
    console.log(`📢 Sharing chunk metadata: ${chunkMetadata.id} for video: ${chunkMetadata.videoId}`);
    
    // Add to local inventory
    this.chunkInventory.set(chunkMetadata.id, chunkMetadata);

    // Broadcast to all connected peers
    const broadcastPromise = Promise.allSettled(
      Array.from(this.connections.entries()).map(async ([peerId, connection]) => {
        if (connection.connectionState === 'connected') {
          // Create data channel for chunk sharing
          const dataChannel = connection.createDataChannel('chunkSharing', {
            ordered: true,
            maxRetransmits: 3,
          });

          // Send chunk metadata
          const metadataBytes = new TextEncoder().encode(JSON.stringify(chunkMetadata));
          dataChannel.send(metadataBytes);

          this.networkStats.addBytesSent(metadataBytes.length);
          this.emit('chunkShared', { peerId, chunkId: chunkMetadata.id });
        }
      })
    );

    const results = await broadcastPromise;
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ Chunk metadata shared with ${successful}/${this.connections.size} peers`);
  }

  /**
   * Request chunk from P2P network with priority-based selection
   */
  async requestChunkFromPeers(chunkId: string, videoId: string): Promise<Uint8Array | null> {
    console.log(`🔍 Requesting chunk ${chunkId} for video: ${videoId} from P2P network`);

    // Check if chunk exists in local inventory
    const localChunk = this.chunkInventory.get(chunkId);
    if (localChunk && localChunk.videoId === videoId) {
      console.log(`✅ Found chunk ${chunkId} in local inventory`);
      return null; // Return null to indicate local availability
    }

    // Find best peer for request based on latency and bandwidth
    const bestPeer = this.findBestPeerForChunk(chunkId);
    if (!bestPeer) {
      console.log('⚠️ No peers available for chunk request');
      return null;
    }

    try {
      console.log(`📥 Requesting chunk ${chunkId} from best peer: ${bestPeer.id} (latency: ${bestPeer.latency}ms)`);
      
      // Simulate chunk request and response
      await new Promise(resolve => setTimeout(resolve, bestPeer.latency));
      
      // Create dummy chunk data
      const chunkData = new Uint8Array(this.config.chunkSize);
      
      this.networkStats.addBytesReceived(chunkData.length);
      this.emit('chunkReceived', { peerId: bestPeer.id, chunkId, size: chunkData.length });
      
      return chunkData;
    } catch (error) {
      console.error(`❌ Failed to request chunk ${chunkId}:`, error);
      return null;
    }
  }

  /**
   * Find best peer for chunk request based on network conditions
   */
  private findBestPeerForChunk(chunkId: string): PeerNode | null {
    let bestPeer: PeerNode | null = null;
    let bestScore = -1;

    for (const peer of this.peers.values()) {
      if (!peer.isActive) continue;

      // Calculate peer score based on bandwidth and latency
      const bandwidthScore = peer.bandwidth / 10; // Normalize bandwidth
      const latencyScore = Math.max(1, 100 - peer.latency); // Lower latency is better
      const chunkAvailabilityScore = this.chunkInventory.has(chunkId) ? 50 : 0; // Prefer peers with the chunk
      
      const totalScore = bandwidthScore + latencyScore + chunkAvailabilityScore;
      
      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestPeer = peer;
      }
    }

    return bestPeer;
  }

  /**
   * Start heartbeat service to maintain connections
   */
  private startHeartbeatService(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.config.heartbeatInterval * 1000);

    console.log(`💓 Heartbeat service started (interval: ${this.config.heartbeatInterval}s)`);
  }

  /**
   * Perform heartbeat to all connected peers
   */
  private performHeartbeat(): void {
    const now = new Date();
    let activeConnections = 0;

    for (const [peerId, connection] of this.connections.entries()) {
      if (connection.connectionState === 'connected') {
        activeConnections++;
        
        // Send heartbeat through data channel
        const dataChannel = connection.createDataChannel('heartbeat');
        if (dataChannel && dataChannel.readyState === 'open') {
          const heartbeat = {
            type: 'heartbeat',
            nodeId: this.localNodeId,
            timestamp: now.getTime(),
          };
          
          const heartbeatBytes = new TextEncoder().encode(JSON.stringify(heartbeat));
          dataChannel.send(heartbeatBytes);
        }
      } else {
        // Remove inactive connection
        console.log(`💔 Removing inactive connection: ${peerId}`);
        this.connections.delete(peerId);
        this.peers.delete(peerId);
      }
    }

    this.networkStats.activeConnections = activeConnections;
    this.emit('heartbeat', { activeConnections, totalPeers: this.peers.size });
  }

  /**
   * Start connection management service
   */
  private startConnectionManager(): void {
    this.discoveryInterval = setInterval(() => {
      this.manageConnections();
    }, 5000);

    console.log('🔌 Connection manager started');
  }

  /**
   * Manage connections and accept new ones
   */
  private manageConnections(): void {
    const currentConnections = this.connections.size;
    const maxPeers = this.config.maxPeers;

    if (currentConnections < maxPeers) {
      console.log(`🔌 Ready to accept new connections (${currentConnections}/${maxPeers})`);
    }

    // Clean up old offers
    this.cleanupOldOffers();
  }

  /**
   * Clean up expired offers and chunks
   */
  private cleanupOldOffers(): void {
    const now = new Date();
    const expiredOffers: string[] = [];

    for (const [offerId, offer] of this.activeOffers.entries()) {
      const age = (now.getTime() - offer.timestamp.getTime()) / 1000;
      if (age > 300) { // 5 minutes TTL
        expiredOffers.push(offerId);
      }
    }

    // Remove expired offers
    for (const expiredOfferId of expiredOffers) {
      this.activeOffers.delete(expiredOfferId);
      console.log(`🗑️ Removed expired offer: ${expiredOfferId}`);
    }
  }

  /**
   * Start chunk sharing service
   */
  private startChunkSharing(): void {
    console.log('📦 Chunk sharing service started');
    
    // Simulate periodic chunk sharing
    setInterval(() => {
      this.shareRandomChunk();
    }, 10000); // Share every 10 seconds
  }

  /**
   * Share a random chunk with peers
   */
  private async shareRandomChunk(): Promise<void> {
    const chunks = Array.from(this.chunkInventory.values());
    if (chunks.length === 0) return;

    // Select a random chunk to share
    const randomChunk = chunks[Math.floor(Math.random() * chunks.length)];
    
    try {
      await this.shareChunkMetadata(randomChunk);
    } catch (error) {
      console.error('❌ Failed to share random chunk:', error);
    }
  }

  /**
   * Send offer to peer through signaling server
   */
  private async sendOfferToPeer(peerId: string, offer: WebRTCOffer): Promise<void> {
    console.log(`📤 Sending WebRTC offer to peer: ${peerId}`);
    
    // In production, this would send to signaling server
    // For now, simulate successful send
    this.activeOffers.set(offer.offerId, offer);
    
    this.emit('offerSent', { peerId, offerId: offer.offerId });
  }

  /**
   * Send answer to peer through signaling server
   */
  private async sendAnswerToPeer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    console.log(`📤 Sending WebRTC answer to peer: ${peerId}`);
    
    // In production, this would send to signaling server
    // For now, simulate successful send
    this.emit('answerSent', { peerId });
  }

  /**
   * Get comprehensive network statistics
   */
  getNetworkStatistics(): INetworkStatistics {
    return {
      nodeId: this.networkStats.nodeId,
      activeConnections: this.networkStats.activeConnections,
      totalPeers: this.peers.size,
      totalConnections: this.connections.size,
      chunksInInventory: this.chunkInventory.size,
      activeOffers: this.activeOffers.size,
      totalBytesSent: this.networkStats.totalBytesSent,
      totalBytesReceived: this.networkStats.totalBytesReceived,
      averageLatency: this.networkStats.averageLatency,
      uptime: Math.floor((new Date().getTime() - this.networkStats.startTime.getTime()) / 1000),
      addConnection: this.networkStats.addConnection.bind(this.networkStats),
      addBytesSent: this.networkStats.addBytesSent.bind(this.networkStats),
      addBytesReceived: this.networkStats.addBytesReceived.bind(this.networkStats),
      getStatisticsString: this.networkStats.getStatisticsString.bind(this.networkStats),
    };
  }

  /**
   * Disconnect from peer network
   */
  async disconnect(): Promise<void> {
    console.log('👋 Disconnecting from P2P network');
    
    // Clear all connections
    for (const [peerId, connection] of this.connections.entries()) {
      connection.close();
    }
    
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
    }
    
    // Clear data structures
    this.connections.clear();
    this.peers.clear();
    this.chunkInventory.clear();
    this.activeOffers.clear();
    
    console.log('✅ Disconnected from P2P network');
    this.emit('disconnected');
  }
}

export interface INetworkStatistics {
  nodeId: string;
  activeConnections: number;
  totalPeers: number;
  totalConnections: number;
  chunksInInventory: number;
  activeOffers: number;
  totalBytesSent: number;
  totalBytesReceived: number;
  averageLatency: number;
  uptime: number;
  
  // Methods
  addConnection(peer: PeerNode): void;
  addBytesSent(bytes: number): void;
  addBytesReceived(bytes: number): void;
  getStatisticsString(): string;
}

export class NetworkStatistics implements INetworkStatistics {
  public nodeId: string;
  public activeConnections = 0;
  public totalPeers = 0;
  public totalConnections = 0;
  public chunksInInventory = 0;
  public activeOffers = 0;
  public totalBytesSent = 0;
  public totalBytesReceived = 0;
  public averageLatency = 0;
  public uptime = 0;
  public startTime: Date = new Date();

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  addConnection(peer: PeerNode): void {
    this.totalConnections++;
    this.activeConnections++;
    this.totalPeers++;
  }

  addBytesSent(bytes: number): void {
    this.totalBytesSent += bytes;
  }

  addBytesReceived(bytes: number): void {
    this.totalBytesReceived += bytes;
  }

  getStatisticsString(): string {
    const uptime = Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000);
    
    return `Node: ${this.nodeId} | Peers: ${this.activeConnections}/${this.totalPeers} | ` +
           `Connections: ${this.totalConnections} | Chunks: ${this.chunksInInventory} | ` +
           `Up: ${(this.totalBytesSent / 1024 / 1024).toFixed(2)}MB | ` +
           `Down: ${(this.totalBytesReceived / 1024 / 1024).toFixed(2)}MB | ` +
           `Latency: ${this.averageLatency}ms | Uptime: ${uptime}s`;
  }
}

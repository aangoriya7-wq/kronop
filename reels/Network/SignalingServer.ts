import { EventEmitter } from 'events';
import * as WebSocket from 'ws';

export interface PeerConnection {
  id: string;
  socket: WebSocket;
  nodeId: string;
  region: string;
  bandwidth: number;
  latency: number;
  lastSeen: Date;
  isActive: boolean;
  room?: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'video-sharing' | 'chunk-exchange';
  peers: string[];
  createdAt: Date;
  isActive: boolean;
}

export interface ISPOptimization {
  isp: string;
  region: string;
  priority: number;
  routes: string[];
  bandwidth: number;
  latency: number;
}

export interface SignalingConfig {
  port: number;
  maxRooms: number;
  maxPeersPerRoom: number;
  maxPeers: number;
  heartbeatInterval: number;
  enableCompression: boolean;
  ispOptimizations: ISPOptimization[];
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'peer-discovery' | 'chunk-request' | 'chunk-response' | 'room-join' | 'room-leave';
  nodeId: string;
  data: any;
  timestamp: Date;
  room?: string;
}

export class SignalingServer extends EventEmitter {
  private config: SignalingConfig;
  private peers: Map<string, PeerConnection> = new Map();
  private rooms: Map<string, Room> = new Map();
  private ispOptimizations: ISPOptimization[];
  private server: any; // WebSocket server instance

  constructor(config: SignalingConfig) {
    super();
    this.config = config;
    this.ispOptimizations = this.initializeISPOptimizations();
    
    console.log(`🌐 Signaling Server initialized on port ${config.port}`);
  }

  /**
   * Initialize ISP optimizations for different providers
   */
  private initializeISPOptimizations(): ISPOptimization[] {
    return [
      {
        isp: "Jio",
        region: "Mumbai",
        priority: 1,
        routes: ["mumbai.jio.com", "delhi.jio.com", "bangalore.jio.com"],
        bandwidth: 50, // Mbps
        latency: 20, // ms
      },
      {
        isp: "Airtel",
        region: "Delhi",
        priority: 2,
        routes: ["delhi.airtel.com", "mumbai.airtel.com"],
        bandwidth: 40, // Mbps
        latency: 25, // ms
      },
      {
        isp: "Vi",
        region: "Delhi",
        priority: 3,
        routes: ["delhi.vi.com", "mumbai.vi.com"],
        bandwidth: 30, // Mbps
        latency: 30, // ms
      },
      {
        isp: "BSNL",
        region: "Mumbai",
        priority: 4,
        routes: ["mumbai.bsnl.com", "delhi.bsnl.com"],
        bandwidth: 20, // Mbps
        latency: 40, // ms
      },
    ];
  }

  /**
   * Start the signaling server
   */
  async startServer(): Promise<void> {
    console.log('🚀 Starting Signaling Server...');
    
    try {
      // Initialize WebSocket server
      const WebSocket = require('ws');
      this.server = new WebSocket.Server({ 
        port: this.config.port,
        perMessageDeflate: this.config.enableCompression,
      });

      // Handle WebSocket connections
      this.server.on('connection', (ws: WebSocket) => {
        this.handleNewConnection(ws);
      });

      console.log(`✅ Signaling server listening on port ${this.config.port}`);
      this.emit('serverStarted', { port: this.config.port });
    } catch (error) {
      console.error('❌ Failed to start signaling server:', error);
      throw error;
    }
  }

  /**
   * Handle new peer connection
   */
  private handleNewConnection(ws: any): void {
    const peerId = this.generatePeerId();
    
    console.log(`🔗 New connection from peer: ${peerId}`);

    const peerConnection: PeerConnection = {
      id: peerId,
      socket: ws,
      nodeId: '',
      region: '',
      bandwidth: 0,
      latency: 0,
      lastSeen: new Date(),
      isActive: true,
    };

    this.peers.set(peerId, peerConnection);

    // Handle messages from this peer
    ws.on('message', (data: any) => {
      try {
        const message: SignalingMessage = JSON.parse(data.toString());
        this.handleSignalingMessage(peerId, message);
      } catch (error) {
        console.error(`❌ Failed to parse message from ${peerId}:`, error);
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      this.handlePeerDisconnection(peerId);
    });

    // Send welcome message
    this.sendMessage(peerId, {
      type: 'peer-discovery',
      nodeId: peerId,
      data: { 
        serverInfo: {
          port: this.config.port,
          maxPeers: this.config.maxPeers,
          rooms: this.rooms.size,
        },
        ispOptimizations: this.ispOptimizations,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Handle signaling messages
   */
  private handleSignalingMessage(peerId: string, message: SignalingMessage): void {
    const { type, data, room } = message;

    switch (type) {
      case 'peer-discovery':
        this.handlePeerDiscovery(peerId, data);
        break;
        
      case 'offer':
        this.handleWebRTCOffer(peerId, data);
        break;
        
      case 'answer':
        this.handleWebRTCAnswer(peerId, data);
        break;
        
      case 'ice-candidate':
        this.handleICECandidate(peerId, data);
        break;
        
      case 'chunk-request':
        this.handleChunkRequest(peerId, data);
        break;
        
      case 'chunk-response':
        this.handleChunkResponse(peerId, data);
        break;
        
      case 'room-join':
        this.handleRoomJoin(peerId, data);
        break;
        
      case 'room-leave':
        this.handleRoomLeave(peerId, data);
        break;
        
      default:
        console.warn(`⚠️ Unknown message type: ${type}`);
    }
  }

  /**
   * Handle WebRTC offer for P2P connection
   */
  private handleWebRTCOffer(peerId: string, data: any): void {
    console.log(`📤 WebRTC Offer from ${peerId}:`, data);

    const offer: SignalingMessage = {
      type: 'offer',
      nodeId: peerId,
      data: data,
      timestamp: new Date(),
    };

    // Relay offer to target peer
    if (data.targetNodeId) {
      this.relayMessage(data.targetNodeId, offer);
    } else {
      // Broadcast to all peers in room
      this.broadcastToRoom(data.room, offer);
    }

    this.emit('offerReceived', { peerId, data });
  }

  /**
   * Handle WebRTC answer for P2P connection
   */
  private handleWebRTCAnswer(peerId: string, data: any): void {
    console.log(`📤 WebRTC Answer from ${peerId}:`, data);

    const answer: SignalingMessage = {
      type: 'answer',
      nodeId: peerId,
      data: data,
      timestamp: new Date(),
    };

    // Relay answer to offering peer
    if (data.offerId) {
      this.relayMessage(data.offerId, answer);
    } else {
      // Broadcast to all peers in room
      this.broadcastToRoom(data.room, answer);
    }

    this.emit('answerReceived', { peerId, data });
  }

  /**
   * Handle ICE candidates for WebRTC
   */
  private handleICECandidate(peerId: string, data: any): void {
    console.log(`🧊 ICE Candidate from ${peerId}:`, data);

    const candidate: SignalingMessage = {
      type: 'ice-candidate',
      nodeId: peerId,
      data: data,
      timestamp: new Date(),
    };

    // Relay ICE candidate to target peer
    if (data.targetNodeId) {
      this.relayMessage(data.targetNodeId, candidate);
    } else {
      // Broadcast to all peers in room
      this.broadcastToRoom(data.room, candidate);
    }
  }

  /**
   * Handle peer discovery
   */
  private handlePeerDiscovery(peerId: string, data: any): void {
    console.log(`🔍 Peer discovery from ${peerId}:`, data);

    const { nodeId, region, bandwidth, latency } = data;
    
    // Update peer information
    if (this.peers.has(peerId)) {
      let peer = this.peers.get(peerId);
      if (peer) {
        peer.nodeId = nodeId;
        peer.region = region;
        peer.bandwidth = bandwidth;
        peer.latency = latency;
        peer.lastSeen = new Date();
      }
    }

    // Find optimal ISP routes for this peer
    const optimalRoute = this.findOptimalRoute(region, bandwidth);
    
    this.sendMessage(peerId, {
      type: 'peer-discovery',
      nodeId: peerId,
      data: {
        optimalRoute,
        ispOptimizations: this.ispOptimizations,
        connectedPeers: Array.from(this.peers.keys()),
      },
      timestamp: new Date(),
    });
  }

  /**
   * Handle chunk requests between peers
   */
  private handleChunkRequest(peerId: string, data: any): void {
    console.log(`📥 Chunk request from ${peerId}:`, data);

    const request: SignalingMessage = {
      type: 'chunk-request',
      nodeId: peerId,
      data: data,
      timestamp: new Date(),
    };

    // Relay chunk request to target peers
    if (data.targetNodeIds && Array.isArray(data.targetNodeIds)) {
      for (const targetNodeId of data.targetNodeIds) {
        this.relayMessage(targetNodeId, request);
      }
    } else {
      // Broadcast to room
      this.broadcastToRoom(data.room, request);
    }

    this.emit('chunkRequested', { peerId, data });
  }

  /**
   * Handle chunk responses between peers
   */
  private handleChunkResponse(peerId: string, data: any): void {
    console.log(`📦 Chunk response from ${peerId}:`, data);

    const response: SignalingMessage = {
      type: 'chunk-response',
      nodeId: peerId,
      data: data,
      timestamp: new Date(),
    };

    // Relay response back to requesting peer
    if (data.requestId) {
      this.relayMessage(data.requestId, response);
    }

    this.emit('chunkResponseReceived', { peerId, data });
  }

  /**
   * Handle room join
   */
  private handleRoomJoin(peerId: string, data: any): void {
    console.log(`🏠 Room join from ${peerId}: ${data.room}`);

    const room = this.rooms.get(data.room);
    if (room) {
      // Add peer to room
      room.peers.push(peerId);
      
      // Update peer connection
      if (this.peers.has(peerId)) {
        let peer = this.peers.get(peerId);
        if (peer) {
          peer.room = data.room;
        }
      }
    }

    this.sendMessage(peerId, {
      type: 'room-join',
      nodeId: peerId,
      data: {
        room: room,
        peers: room ? room.peers : [],
      },
      timestamp: new Date(),
    });
  }

  /**
   * Handle room leave
   */
  private handleRoomLeave(peerId: string, data: any): void {
    console.log(`🚪 Room leave from ${peerId}: ${data.room}`);

    const room = this.rooms.get(data.room);
    if (room) {
      // Remove peer from room
      room.peers = room.peers.filter(id => id !== peerId);
      
      // Update peer connection
      if (this.peers.has(peerId)) {
        let peer = this.peers.get(peerId);
        if (peer) {
          peer.room = undefined;
        }
      }
    }

    this.sendMessage(peerId, {
      type: 'room-leave',
      nodeId: peerId,
      data: {
        room: data.room,
        peers: room ? room.peers : [],
      },
      timestamp: new Date(),
    });
  }

  /**
   * Find optimal ISP route for peer region
   */
  private findOptimalRoute(region: string, bandwidth: number): string {
    const ispOpt = this.ispOptimizations.find(opt => opt.region === region);
    
    if (ispOpt) {
      // Select route based on bandwidth and priority
      if (bandwidth > 30) {
        return ispOpt.routes[0]; // Highest bandwidth route
      } else if (bandwidth > 20) {
        return ispOpt.routes[1]; // Medium bandwidth route
      } else {
        return ispOpt.routes[2]; // Default route
      }
    }
    
    return "default-route"; // Fallback route
  }

  /**
   * Send message to specific peer
   */
  private sendMessage(peerId: string, message: SignalingMessage): void {
    const peer = this.peers.get(peerId);
    
    if (peer && peer.socket.readyState === 1) { // WebSocket.OPEN = 1
      peer.socket.send(JSON.stringify(message));
      peer.lastSeen = new Date();
    } else {
      console.warn(`⚠️ Peer ${peerId} not connected or socket not ready`);
    }
  }

  /**
   * Relay message through signaling server
   */
  private relayMessage(targetNodeId: string, message: SignalingMessage): void {
    const targetPeer = this.peers.get(targetNodeId);
    
    if (targetPeer && targetPeer.socket.readyState === 1) { // WebSocket.OPEN = 1
      targetPeer.socket.send(JSON.stringify(message));
      console.log(`📤 Relayed message to ${targetNodeId} via ${targetPeer.id}`);
    } else {
      console.warn(`⚠️ Target peer ${targetNodeId} not connected`);
    }
  }

  /**
   * Broadcast message to all peers in a room
   */
  private broadcastToRoom(roomId: string, message: SignalingMessage): void {
    const room = this.rooms.get(roomId);
    
    if (room) {
      console.log(`📡 Broadcasting to room ${roomId}: ${message.type}`);
      
      for (const peerId of room.peers) {
        this.sendMessage(peerId, message);
      }
    }
  }

  /**
   * Generate unique peer ID
   */
  private generatePeerId(): string {
    return `peer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle peer disconnection
   */
  private handlePeerDisconnection(peerId: string): void {
    console.log(`👋 Peer disconnected: ${peerId}`);

    // Remove peer from all rooms
    for (const [roomId, room] of this.rooms.entries()) {
      room.peers = room.peers.filter(id => id !== peerId);
      
      // Remove room if empty
      if (room.peers.length === 0) {
        this.rooms.delete(roomId);
      }
    }

    // Remove peer
    this.peers.delete(peerId);

    this.emit('peerDisconnected', { peerId });
  }

  /**
   * Get server statistics
   */
  getServerStatistics(): any {
    const activePeers = Array.from(this.peers.values()).filter(p => p.isActive).length;
    const totalPeers = this.peers.size;
    const activeRooms = Array.from(this.rooms.values()).filter(r => r.isActive).length;
    const totalRooms = this.rooms.size;

    return {
      port: this.config.port,
      activePeers,
      totalPeers,
      activeRooms,
      totalRooms,
      ispOptimizations: this.ispOptimizations,
      uptime: process.uptime(),
    };
  }

  /**
   * Create or join a room for video sharing
   */
  async createRoom(name: string, type: 'video-sharing' | 'chunk-exchange'): Promise<string> {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const room: Room = {
      id: roomId,
      name,
      type,
      peers: [],
      createdAt: new Date(),
      isActive: true,
    };

    this.rooms.set(roomId, room);

    console.log(`🏠 Created room: ${name} (${roomId})`);
    return roomId;
  }

  /**
   * Stop the signaling server
   */
  async stopServer(): Promise<void> {
    console.log('👋 Stopping Signaling Server...');

    // Close all peer connections
    for (const [peerId, peer] of this.peers.entries()) {
      if (peer.socket && peer.socket.readyState === 1) { // WebSocket.OPEN = 1
        peer.socket.close();
      }
    }

    // Close server
    if (this.server) {
      this.server.close(() => {
        console.log('✅ Signaling server stopped');
        this.emit('serverStopped');
      });
    }
  }
}

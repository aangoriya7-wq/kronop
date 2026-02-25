export default {
  // QUIC Protocol Configuration
  quic: {
    version: 'h3-29',
    alpn: ['h3', 'h2'],
    
    // Connection Settings
    connection: {
      maxStreams: 100,
      idleTimeout: 30000,
      handshakeTimeout: 100,
      zeroRtt: true,
      earlyData: true,
    },
    
    // Congestion Control
    congestion: {
      algorithm: 'bbr',
      initialWindow: 10,
      minWindow: 2,
      maxWindow: 100,
    },
    
    // Stream Priority
    priority: {
      video: 1,
      audio: 2,
      metadata: 3,
      comments: 4,
    },
    
    // 0.001ms Optimization
    optimization: {
      packetPacing: true,
      headerCompression: true,
      fastOpen: true,
      ecn: true,
    },
  },
  
  // Transport Parameters
  transport: {
    maxUdpPayloadSize: 1452,
    ackDelayExponent: 3,
    maxAckDelay: 25,
    activeConnectionIdLimit: 2,
  },
};

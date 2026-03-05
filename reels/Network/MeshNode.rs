use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::{Duration, Instant};
use serde::{Serialize, Deserialize};
use bytes::Bytes;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    pub node_id: String,
    pub ip_address: String,
    pub port: u16,
    pub capabilities: Vec<String>,
    pub bandwidth: u64,        // bytes per second
    pub latency: u64,          // milliseconds
    pub region: String,
    pub is_active: bool,
    pub last_seen: Instant,
    pub peer_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkMetadata {
    pub chunk_id: usize,
    pub video_id: String,
    pub checksum: String,
    pub size: usize,
    pub priority: ChunkPriority,
    pub source_nodes: Vec<String>, // Nodes that have this chunk
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum ChunkPriority {
    Critical = 1,   // Currently playing chunk
    High = 2,       // Next few chunks
    Medium = 3,     // Prefetched chunks
    Low = 4,         // Background chunks
}

#[derive(Debug, Clone)]
pub struct WebRTCConnection {
    pub connection_id: String,
    pub remote_node_id: String,
    pub data_channel: String,
    pub state: ConnectionState,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub created_at: Instant,
    pub last_activity: Instant,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ConnectionState {
    Connecting,
    Connected,
    Disconnected,
    Failed,
}

#[derive(Debug, Clone)]
pub struct MeshConfig {
    pub max_peers: usize,
    pub chunk_size: usize,
    pub connection_timeout: Duration,
    pub heartbeat_interval: Duration,
    pub enable_encryption: bool,
    pub enable_compression: bool,
    pub region_preference: String,
}

impl Default for MeshConfig {
    fn default() -> Self {
        Self {
            max_peers: 50,
            chunk_size: 1024 * 1024, // 1MB chunks
            connection_timeout: Duration::from_secs(30),
            heartbeat_interval: Duration::from_secs(10),
            enable_encryption: true,
            enable_compression: true,
            region_preference: "auto".to_string(),
        }
    }
}

pub struct MeshNode {
    config: MeshConfig,
    node_info: Arc<RwLock<NodeInfo>>,
    connections: Arc<RwLock<HashMap<String, WebRTCConnection>>>,
    chunk_inventory: Arc<RwLock<HashMap<String, ChunkMetadata>>>,
    active_offers: Arc<RwLock<HashMap<String, Vec<String>>>>,
    network_stats: Arc<RwLock<NetworkStats>>,
}

impl MeshNode {
    pub fn new(node_id: String, ip_address: String, port: u16, config: MeshConfig) -> Self {
        let node_info = NodeInfo {
            node_id: node_id.clone(),
            ip_address,
            port,
            capabilities: vec![
                "webrtc".to_string(),
                "chunk-sharing".to_string(),
                "metadata-sync".to_string(),
            ],
            bandwidth: 10 * 1024 * 1024, // 10 Mbps default
            latency: 50, // 50ms default
            region: "unknown".to_string(),
            is_active: true,
            last_seen: Instant::now(),
            peer_count: 0,
        };

        Self {
            config,
            node_info: Arc::new(RwLock::new(node_info)),
            connections: Arc::new(RwLock::new(HashMap::new())),
            chunk_inventory: Arc::new(RwLock::new(HashMap::new())),
            active_offers: Arc::new(RwLock::new(HashMap::new())),
            network_stats: Arc::new(RwLock::new(NetworkStats::default())),
        }
    }

    /// Initialize WebRTC mesh network
    pub async fn initialize_mesh(&self) -> Result<(), Box<dyn std::error::Error>> {
        println!("🌐 Initializing WebRTC Mesh Network");
        println!("📡 Node ID: {}", self.node_info.read().await.node_id);
        
        // Start heartbeat service
        self.start_heartbeat_service().await;
        
        // Start peer discovery
        self.start_peer_discovery().await?;
        
        // Start connection management
        self.start_connection_manager().await;
        
        println!("✅ Mesh network initialized successfully");
        Ok(())
    }

    /// Node discovery: Find and connect to nearby peers
    pub async fn start_peer_discovery(&self) -> Result<(), Box<dyn std::error::Error>> {
        println!("🔍 Starting peer discovery...");
        
        // Simulate peer discovery (in real implementation, this would use STUN/TURN servers)
        let discovered_peers = vec![
            NodeInfo {
                node_id: "peer_1".to_string(),
                ip_address: "192.168.1.100".to_string(),
                port: 8080,
                capabilities: vec!["webrtc".to_string(), "chunk-sharing".to_string()],
                bandwidth: 20 * 1024 * 1024, // 20 Mbps
                latency: 30,
                region: "us-west".to_string(),
                is_active: true,
                last_seen: Instant::now(),
                peer_count: 5,
            },
            NodeInfo {
                node_id: "peer_2".to_string(),
                ip_address: "192.168.1.101".to_string(),
                port: 8080,
                capabilities: vec!["webrtc".to_string(), "chunk-sharing".to_string()],
                bandwidth: 15 * 1024 * 1024, // 15 Mbps
                latency: 40,
                region: "eu-west".to_string(),
                is_active: true,
                last_seen: Instant::now(),
                peer_count: 3,
            },
        ];
        
        // Connect to discovered peers
        for peer in discovered_peers {
            if peer.node_id != self.node_info.read().await.node_id {
                self.connect_to_peer(&peer).await?;
            }
        }
        
        println!("✅ Discovered and connected to {} peers", discovered_peers.len());
        Ok(())
    }

    /// Connect to a specific peer using WebRTC
    pub async fn connect_to_peer(&self, peer_info: &NodeInfo) -> Result<(), Box<dyn std::error::Error>> {
        let connection_id = format!("{}_{}", 
                                   self.node_info.read().await.node_id, 
                                   peer_info.node_id);
        
        println!("🤝 Connecting to peer: {} ({})", peer_info.node_id, peer_info.ip_address);
        
        // Simulate WebRTC connection establishment
        let connection = WebRTCConnection {
            connection_id: connection_id.clone(),
            remote_node_id: peer_info.node_id.clone(),
            data_channel: format!("data_channel_{}", connection_id),
            state: ConnectionState::Connecting,
            bytes_sent: 0,
            bytes_received: 0,
            created_at: Instant::now(),
            last_activity: Instant::now(),
        };
        
        // Add to connections
        {
            let mut connections = self.connections.write().await;
            connections.insert(connection_id.clone(), connection);
        }
        
        // Simulate connection establishment
        tokio::time::sleep(Duration::from_millis(500)).await;
        
        // Update connection state to connected
        {
            let mut connections = self.connections.write().await;
            if let Some(conn) = connections.get_mut(&connection_id) {
                conn.state = ConnectionState::Connected;
                conn.last_activity = Instant::now();
            }
        }
        
        // Update peer count
        {
            let mut node_info = self.node_info.write().await;
            node_info.peer_count += 1;
        }
        
        println!("✅ Connected to peer: {}", peer_info.node_id);
        Ok(())
    }

    /// Handle WebRTC offer/answer logic for P2P communication
    pub async fn handle_webrtc_handshake(&self, remote_node_id: &str, offer_data: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        println!("🤝 WebRTC Handshake with peer: {}", remote_node_id);
        
        // Create answer for the offer
        let answer_data = self.create_webrtc_answer(offer_data).await?;
        
        // Send answer back through the connection
        let connection_id = format!("{}_{}", 
                                   self.node_info.read().await.node_id, 
                                   remote_node_id);
        
        {
            let connections = self.connections.read().await;
            if let Some(connection) = connections.get(&connection_id) {
                // Simulate sending answer
                println!("📤 Sending WebRTC answer to peer: {}", remote_node_id);
                
                // Update connection activity
                let mut connections = self.connections.write().await;
                if let Some(conn) = connections.get_mut(&connection_id) {
                    conn.last_activity = Instant::now();
                    conn.bytes_sent += answer_data.len() as u64;
                }
            }
        }
        
        Ok(answer_data)
    }

    /// Create WebRTC answer for peer connection
    async fn create_webrtc_answer(&self, offer_data: &[u8]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        // Simulate WebRTC SDP answer generation
        let answer_sdp = format!(
            "v=0\r\no=- {} 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=mid:0\r\na=sendrecv\r\na=rtcp-mux\r\n",
            self.node_info.read().await.node_id
        );
        
        // Add encryption if enabled
        let final_answer = if self.config.enable_encryption {
            format!("{}a=crypto:1:AES_CM_128_HMAC_SHA1_80\r\n", answer_sdp)
        } else {
            answer_sdp
        };
        
        Ok(final_answer.into_bytes())
    }

    /// Share chunk metadata with peers
    pub async fn share_chunk_metadata(&self, chunk_metadata: ChunkMetadata) -> Result<(), Box<dyn std::error::Error>> {
        println!("📢 Sharing chunk metadata: {} for video: {}", 
                chunk_metadata.chunk_id, chunk_metadata.video_id);
        
        // Add to local inventory
        {
            let mut inventory = self.chunk_inventory.write().await;
            inventory.insert(chunk_metadata.checksum.clone(), chunk_metadata);
        }
        
        // Broadcast to all connected peers
        let connections = self.connections.read().await;
        for (connection_id, connection) in connections.iter() {
            if connection.state == ConnectionState::Connected {
                // Simulate broadcasting metadata
                println!("📡 Broadcasting chunk {} to peer: {}", 
                        chunk_metadata.chunk_id, connection.remote_node_id);
                
                let metadata_bytes = serde_json::to_vec(&chunk_metadata)?;
                
                // Update connection stats
                let mut connections = self.connections.write().await;
                if let Some(conn) = connections.get_mut(connection_id) {
                    conn.bytes_sent += metadata_bytes.len() as u64;
                    conn.last_activity = Instant::now();
                }
            }
        }
        
        Ok(())
    }

    /// Request chunk from P2P network
    pub async fn request_chunk_from_peers(&self, chunk_id: usize, video_id: &str) -> Result<Option<Bytes>, Box<dyn std::error::Error>> {
        println!("🔍 Requesting chunk {} for video: {} from P2P network", 
                chunk_id, video_id);
        
        // Check if chunk exists in local inventory
        let inventory = self.chunk_inventory.read().await;
        for (checksum, metadata) in inventory.iter() {
            if metadata.chunk_id == chunk_id && metadata.video_id == video_id {
                println!("✅ Found chunk {} in local inventory", chunk_id);
                return Ok(None); // Return None to indicate local availability
            }
        }
        
        // Request from peers with priority-based selection
        let connections = self.connections.read().await;
        let mut best_peer = None;
        let mut best_latency = u64::MAX;
        
        for (connection_id, connection) in connections.iter() {
            if connection.state == ConnectionState::Connected {
                // Simulate peer selection based on latency
                let peer_latency = 50; // This would come from peer metadata
                if peer_latency < best_latency {
                    best_latency = peer_latency;
                    best_peer = Some(connection.remote_node_id.clone());
                }
            }
        }
        
        if let Some(peer_id) = best_peer {
            println!("📥 Requesting chunk {} from best peer: {} (latency: {}ms)", 
                    chunk_id, peer_id, best_latency);
            
            // Simulate chunk request and response
            tokio::time::sleep(Duration::from_millis(best_latency)).await;
            
            // Create dummy chunk data
            let chunk_data = vec![0u8; self.config.chunk_size];
            Ok(Some(chunk_data.into()))
        } else {
            println!("⚠️  No peers available for chunk request");
            Ok(None)
        }
    }

    /// Start heartbeat service to maintain connections
    async fn start_heartbeat_service(&self) {
        let node_id = self.node_info.read().await.node_id.clone();
        let connections = self.connections.clone();
        let heartbeat_interval = self.config.heartbeat_interval;
        
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(heartbeat_interval).await;
                
                let mut active_connections = 0;
                {
                    let conn = connections.read().await;
                    for (connection_id, connection) in conn.iter() {
                        // Check if connection is still active
                        let is_active = connection.last_activity.elapsed() < Duration::from_secs(30);
                        
                        if !is_active {
                            println!("💔 Removing inactive connection: {}", connection_id);
                            let mut conn = connections.write().await;
                            conn.remove(connection_id);
                        } else {
                            active_connections += 1;
                        }
                    }
                }
                
                println!("💓 Heartbeat: {} | Active connections: {}", node_id, active_connections);
            }
        });
    }

    /// Start connection management service
    async fn start_connection_manager(&self) {
        let connections = self.connections.clone();
        let max_peers = self.config.max_peers;
        
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(5)).await;
                
                let conn = connections.read().await;
                let current_peers = conn.len();
                
                // Accept new connections if under limit
                if current_peers < max_peers {
                    println!("🔌 Ready to accept new connections ({}/{})", current_peers, max_peers);
                }
                
                // Update network stats
                let mut total_sent = 0u64;
                let mut total_received = 0u64;
                for connection in conn.values() {
                    total_sent += connection.bytes_sent;
                    total_received += connection.bytes_received;
                }
                
                println!("📊 Network Stats: Sent: {}MB | Received: {}MB | Peers: {}", 
                        total_sent / (1024 * 1024),
                        total_received / (1024 * 1024),
                        current_peers);
            }
        });
    }

    /// Get comprehensive network statistics
    pub async fn get_network_stats(&self) -> NetworkStats {
        let connections = self.connections.read().await;
        let inventory = self.chunk_inventory.read().await;
        let node_info = self.node_info.read().await;
        
        let active_connections = connections.values()
            .filter(|c| c.state == ConnectionState::Connected)
            .count();
        
        let total_chunks_shared = inventory.len();
        let total_bandwidth_up: u64 = connections.values()
            .map(|c| c.bytes_sent)
            .sum();
        
        let total_bandwidth_down: u64 = connections.values()
            .map(|c| c.bytes_received)
            .sum();
        
        NetworkStats {
            node_id: node_info.node_id.clone(),
            active_connections,
            total_connections: connections.len(),
            chunks_shared: total_chunks_shared,
            total_bandwidth_up,
            total_bandwidth_down,
            average_latency: self.calculate_average_latency().await,
            uptime: node_info.last_seen.elapsed(),
        }
    }

    /// Calculate average latency across all connections
    async fn calculate_average_latency(&self) -> u64 {
        let connections = self.connections.read().await;
        let active_connections: Vec<_> = connections.values()
            .filter(|c| c.state == ConnectionState::Connected)
            .collect();
        
        if active_connections.is_empty() {
            return 0;
        }
        
        let total_latency: u64 = active_connections.iter()
            .map(|_| 50) // Simulated latency
            .sum();
        
        total_latency / active_connections.len() as u64
    }

    /// Disconnect from a peer
    pub async fn disconnect_from_peer(&self, peer_node_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        println!("👋 Disconnecting from peer: {}", peer_node_id);
        
        // Find and remove connection
        let connection_id = format!("{}_{}", 
                                   self.node_info.read().await.node_id, 
                                   peer_node_id);
        
        {
            let mut connections = self.connections.write().await;
            if let Some(mut connection) = connections.remove(&connection_id) {
                connection.state = ConnectionState::Disconnected;
                println!("✅ Disconnected from peer: {}", peer_node_id);
            }
        }
        
        // Update peer count
        {
            let mut node_info = self.node_info.write().await;
            node_info.peer_count = node_info.peer_count.saturating_sub(1);
        }
        
        Ok(())
    }
}

#[derive(Debug, Clone, Default)]
pub struct NetworkStats {
    pub node_id: String,
    pub active_connections: usize,
    pub total_connections: usize,
    pub chunks_shared: usize,
    pub total_bandwidth_up: u64,
    pub total_bandwidth_down: u64,
    pub average_latency: u64,
    pub uptime: Duration,
}

impl NetworkStats {
    pub fn get_stats_string(&self) -> String {
        format!(
            "Node: {} | Peers: {}/{} | Chunks: {} | Up: {}MB | Down: {}MB | Latency: {}ms | Uptime: {:.1}s",
            self.node_id,
            self.active_connections,
            self.total_connections,
            self.chunks_shared,
            self.total_bandwidth_up / (1024 * 1024),
            self.total_bandwidth_down / (1024 * 1024),
            self.average_latency,
            self.uptime.as_secs()
        )
    }
}

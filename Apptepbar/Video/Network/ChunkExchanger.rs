use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::time::{Duration, Instant};
use bytes::Bytes;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkRequest {
    pub request_id: String,
    pub chunk_id: usize,
    pub video_id: String,
    pub priority: RequestPriority,
    pub requesting_node: String,
    pub target_nodes: Vec<String>,
    pub checksum: String,
    pub created_at: Instant,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum RequestPriority {
    Critical = 1,   // Currently playing chunk
    High = 2,       // Next few chunks
    Medium = 3,     // Prefetched chunks
    Low = 4,         // Background chunks
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkResponse {
    pub response_id: String,
    pub chunk_id: usize,
    pub video_id: String,
    pub data: Option<Bytes>,
    pub source_node: String,
    pub success: bool,
    pub latency_ms: u64,
    pub checksum_verified: bool,
    pub timestamp: Instant,
}

#[derive(Debug, Clone)]
pub struct PeerInfo {
    pub node_id: String,
    pub bandwidth: u64,        // bytes per second
    pub latency: u64,          // milliseconds
    pub region: String,
    pub chunk_inventory: HashMap<String, ChunkInfo>,
    pub upload_balance: u64,     // Upload capacity in bytes
    pub download_balance: u64,    // Download capacity in bytes
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChunkInfo {
    pub chunk_id: usize,
    pub video_id: String,
    pub checksum: String,
    pub size: usize,
    pub priority: ChunkPriority,
    pub source_nodes: Vec<String>,
    pub created_at: Instant,
    pub ttl: u64,             // Time to live in seconds
    pub access_count: u64,       // Number of times accessed
}

#[derive(Debug, Clone)]
pub struct ChunkExchangerConfig {
    pub max_peers: usize,
    pub chunk_size: usize,
    pub request_timeout: Duration,
    pub enable_verification: bool,
    pub enable_compression: bool,
    pub load_balance_strategy: LoadBalanceStrategy,
}

#[derive(Debug, Clone, Copy)]
pub enum LoadBalanceStrategy {
    RoundRobin,
    BandwidthBased,
    LatencyBased,
    RegionBased,
}

impl Default for ChunkExchangerConfig {
    fn default() -> Self {
        Self {
            max_peers: 50,
            chunk_size: 1024 * 1024, // 1MB chunks
            request_timeout: Duration::from_secs(10),
            enable_verification: true,
            enable_compression: true,
            load_balance_strategy: LoadBalanceStrategy::BandwidthBased,
        }
    }
}

pub struct ChunkExchanger {
    config: ChunkExchangerConfig,
    local_node_id: String,
    peers: Arc<RwLock<HashMap<String, PeerInfo>>>,
    chunk_requests: Arc<RwLock<HashMap<String, ChunkRequest>>>,
    chunk_responses: Arc<RwLock<HashMap<String, ChunkResponse>>>,
    network_stats: Arc<RwLock<NetworkStatistics>>,
}

impl ChunkExchanger {
    pub fn new(local_node_id: String, config: ChunkExchangerConfig) -> Self {
        Self {
            config,
            local_node_id,
            peers: Arc::new(RwLock::new(HashMap::new())),
            chunk_requests: Arc::new(RwLock::new(HashMap::new())),
            chunk_responses: Arc::new(RwLock::new(HashMap::new())),
            network_stats: Arc::new(RwLock::new(NetworkStatistics::new())),
        }
    }

    /// Smart Chunk Request: Request chunks from P2P network with intelligent routing
    pub async fn request_chunk_from_p2p(&self, chunk_request: ChunkRequest) -> Result<ChunkResponse, Box<dyn std::error::Error>> {
        println!("🔍 Smart Chunk Request: {} for video: {} (priority: {:?})", 
                chunk_request.chunk_id, chunk_request.video_id, chunk_request.priority);

        let start_time = Instant::now();
        
        // Select best peers based on strategy
        let selected_peers = self.select_peers_for_request(&chunk_request).await?;
        
        if selected_peers.is_empty() {
            return Err("No suitable peers available".into());
        }

        // Send requests to selected peers in parallel
        let mut handles = Vec::new();
        for peer_id in selected_peers {
            let peer_info = self.peers.read().await.get(peer_id).cloned()
                .ok_or_else(|| PeerInfo::default())?;
            
            let request = chunk_request.clone();
            let exchanger = self.clone();
            let network_stats = self.network_stats.clone();
            
            let handle = tokio::spawn(async move {
                exchanger.send_chunk_request_to_peer(&peer_info, &request).await
            });
            
            handles.push(handle);
        }

        // Wait for first response
        let mut best_response: Option<ChunkResponse> = None;
        let mut best_latency = u64::MAX;

        // Wait for responses with timeout
        tokio::select! {
            _ = tokio::time::sleep(self.config.request_timeout) => {
                return Err("Request timeout".into());
            }
            _ = tokio::signal::ctrl_c() => {
                return Err("Request cancelled".into());
            }
            _ = async {
                for handle in &mut handles {
                    if let Ok(response) = handle.await {
                        let latency = start_time.elapsed().as_millis();
                        
                        // Verify checksum if enabled
                        let checksum_verified = if self.config.enable_verification {
                            Self::verify_chunk_checksum(&response, &chunk_request.checksum)
                        } else {
                            true
                        };

                        let chunk_response = ChunkResponse {
                            response_id: format!("resp_{}", response.response_id),
                            chunk_id: response.chunk_id,
                            video_id: response.video_id,
                            data: response.data,
                            source_node: response.source_node,
                            success: response.success,
                            latency_ms: latency,
                            checksum_verified,
                            timestamp: Instant::now(),
                        };

                        // Update network statistics
                        {
                            let mut stats = network_stats.write().await;
                            stats.add_request_completed(&chunk_response);
                        }

                        // Track best response
                        if latency < best_latency && response.success {
                            best_latency = latency;
                            best_response = Some(chunk_response);
                        }

                        println!("✅ Response from peer {}: {}ms (verified: {})", 
                                peer_id, latency, checksum_verified);
                    }
                }
            }
        }

        // Cancel remaining requests
        for handle in handles {
            handle.abort();
        }

        best_response.ok_or_else(|| "No successful response".into())
    }

    /// Select best peers based on load balancing strategy
    async fn select_peers_for_request(&self, request: &ChunkRequest) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let peers = self.peers.read().await;
        let mut peer_scores: Vec<(String, u64)> = Vec::new();

        for (peer_id, peer_info) in peers.iter() {
            let score = self.calculate_peer_score(peer_info, request).await;
            peer_scores.push((peer_id.clone(), score));
        }

        // Sort by score (higher is better)
        peer_scores.sort_by(|a, b| b.1.cmp(&a.1));

        // Select top peers (max 3 for redundancy)
        let max_peers_per_request = std::cmp::min(3, peer_scores.len());
        let selected_peers: Vec<String> = peer_scores
            .iter()
            .take(max_peers_per_request)
            .map(|(peer_id, _)| peer_id.clone())
            .collect();

        println!("🎯 Selected {} peers for request: {:?}", 
                selected_peers.len(), selected_peers);

        Ok(selected_peers)
    }

    /// Calculate peer score based on load balancing strategy
    async fn calculate_peer_score(&self, peer_info: &PeerInfo, request: &ChunkRequest) -> u64 {
        match self.config.load_balance_strategy {
            LoadBalanceStrategy::BandwidthBased => {
                // Prioritize peers with higher bandwidth
                peer_info.bandwidth / 1024 // Convert to Mbps
            }
            LoadBalanceStrategy::LatencyBased => {
                // Prioritize peers with lower latency
                std::cmp::max(1, 1000 - peer_info.latency as u64)
            }
            LoadBalanceStrategy::RegionBased => {
                // Prioritize peers in same region
                if peer_info.region == "us-west" { 1000 } else { 500 }
            }
            LoadBalanceStrategy::RoundRobin => {
                // Equal distribution
                500
            }
        }
    }

    /// Send chunk request to specific peer
    async fn send_chunk_request_to_peer(&self, peer_info: &PeerInfo, request: &ChunkRequest) -> ChunkResponse {
        println!("📤 Sending chunk request {} to peer: {}", request.chunk_id, peer_info.node_id);

        let start_time = Instant::now();
        
        // Simulate WebRTC data channel communication
        let data = serde_json::to_vec(request).unwrap_or_default();
        
        // Simulate network delay based on peer latency
        tokio::time::sleep(Duration::from_millis(peer_info.latency)).await;

        // Simulate response
        let success = true; // In real implementation, this would depend on actual response
        let data_size = self.config.chunk_size;
        let dummy_data = vec![0u8; data_size];
        
        let response = ChunkResponse {
            response_id: format!("resp_{}_{}", peer_info.node_id, request.request_id),
            chunk_id: request.chunk_id,
            video_id: request.video_id.clone(),
            data: Some(dummy_data.into()),
            source_node: peer_info.node_id.clone(),
            success,
            latency_ms: start_time.elapsed().as_millis(),
            checksum_verified: false, // Will be verified after response
            timestamp: Instant::now(),
        };

        // Update peer statistics
        {
            let mut peers = self.peers.write().await;
            if let Some(peer) = peers.get_mut(&peer_info.node_id) {
                peer.access_count += 1;
            }
        }

        response
    }

    /// Verify chunk checksum
    fn verify_chunk_checksum(response: &ChunkResponse, expected_checksum: &str) -> bool {
        if let Some(data) = &response.data {
            // Calculate SHA-256 checksum of received data
            use sha2::{Sha256, Digest};
            let mut hasher = Sha256::new();
            hasher.update(data);
            let calculated_checksum = format!("{:x}", hasher.finalize());
            
            let verified = calculated_checksum == expected_checksum;
            
            if verified {
                println!("✅ Checksum verified for chunk {}", response.chunk_id);
            } else {
                println!("❌ Checksum mismatch for chunk {}: expected {}, got {}", 
                        response.chunk_id, expected_checksum, calculated_checksum);
            }
            
            verified
        } else {
            false
        }
    }

    /// Upload/Download Balance: Monitor and balance peer contributions
    pub async fn update_peer_balance(&self, peer_id: &str, upload_bytes: u64, download_bytes: u64) -> Result<(), Box<dyn std::error::Error>> {
        println!("⚖️  Updating peer balance: {} (upload: {}MB, download: {}MB)", 
                peer_id, upload_bytes / (1024 * 1024), download_bytes / (1024 * 1024));

        let mut peers = self.peers.write().await;
        if let Some(peer) = peers.get_mut(peer_id) {
            peer.upload_balance = peer.upload_balance.saturating_sub(upload_bytes);
            peer.download_balance = peer.download_balance.saturating_add(download_bytes);
            
            // Update peer reliability score
            let reliability_score = if peer.upload_balance > 0 && peer.download_balance > 0 {
                peer.access_count as u64 * 100 / (peer.upload_balance + peer.download_balance)
            } else {
                0
            };
            
            println!("✅ Peer {} balance updated: upload={}MB, download={}MB, reliability={:.2}%", 
                    peer_id, 
                    peer.upload_balance / (1024 * 1024),
                    peer.download_balance / (1024 * 1024),
                    reliability_score);
        } else {
            return Err(format!("Peer {} not found", peer_id).into());
        }

        Ok(())
    }

    /// Get network statistics
    pub async fn get_network_statistics(&self) -> NetworkStatistics {
        let peers = self.peers.read().await;
        let requests = self.chunk_requests.read().await;
        let responses = self.chunk_responses.read().await;
        let stats = self.network_stats.read().await.clone();

        NetworkStatistics {
            node_id: self.local_node_id.clone(),
            total_peers: peers.len(),
            active_peers: peers.values().filter(|p| p.upload_balance > 0).count(),
            total_requests: requests.len(),
            successful_requests: responses.values().filter(|r| r.success).count(),
            failed_requests: responses.values().filter(|r| !r.success).count(),
            average_latency: self.calculate_average_latency().await,
            total_bandwidth_up: peers.values().map(|p| p.upload_balance).sum(),
            total_bandwidth_down: peers.values().map(|p| p.download_balance).sum(),
            uptime: stats.uptime,
        }
    }

    /// Calculate average latency across all successful responses
    async fn calculate_average_latency(&self) -> u64 {
        let responses = self.chunk_responses.read().await;
        let successful_responses: Vec<_> = responses.values()
            .filter(|r| r.success)
            .collect();
        
        if successful_responses.is_empty() {
            return 0;
        }

        let total_latency: u64 = successful_responses.iter()
            .map(|r| r.latency_ms)
            .sum();
        
        total_latency / successful_responses.len() as u64
    }
}

#[derive(Debug, Clone, Default)]
pub struct NetworkStatistics {
    pub node_id: String,
    pub total_peers: usize,
    pub active_peers: usize,
    pub total_requests: usize,
    pub successful_requests: usize,
    pub failed_requests: usize,
    pub average_latency: u64,
    pub total_bandwidth_up: u64,
    pub total_bandwidth_down: u64,
    pub uptime: Duration,
}

impl NetworkStatistics {
    pub fn get_statistics_string(&self) -> String {
        format!(
            "Node: {} | Peers: {}/{} | Requests: {}/{} ({}% success) | Latency: {}ms | Up: {}MB | Down: {}MB | Uptime: {:.1}s",
            self.node_id,
            self.active_peers,
            self.total_peers,
            self.total_requests,
            self.successful_requests,
            if self.total_requests > 0 {
                (self.successful_requests * 100) / self.total_requests
            } else {
                0
            },
            self.average_latency,
            self.total_bandwidth_up / (1024 * 1024),
            self.total_bandwidth_down / (1024 * 1024),
            self.uptime.as_secs()
        )
    }
}

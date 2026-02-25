use k256::{
    ecdsa::{VerifyingKey, Signature, RecoveryId},
    PublicKey, Secp256k1,
};
use sha3::{Keccak256, Digest};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{Utc, Duration};
use redis::AsyncCommands;

/// 🚀 रस्ट का असली जादू - k256 के साथ Signature Verification
pub struct SignatureVerifier {
    redis_client: Arc<redis::Client>,
    failed_attempts: Arc<RwLock<HashMap<String, Vec<i64>>>>,
    max_attempts: usize,
    window_seconds: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct VerificationResult {
    pub verified: bool,
    pub address: String,
    pub confidence: f32,
    pub error: Option<String>,
    pub timestamp: i64,
}

impl SignatureVerifier {
    pub async fn new(redis_url: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let client = redis::Client::open(redis_url)?;
        
        Ok(Self {
            redis_client: Arc::new(client),
            failed_attempts: Arc::new(RwLock::new(HashMap::new())),
            max_attempts: 5,        // 5 attempts
            window_seconds: 300,     // in 5 minutes
        })
    }

    /// 🔥 EIP-155 Ethereum Signature Verification (k256)
    pub async fn verify_signature(
        &self,
        address: &str,
        message: &str,
        signature_hex: &str,
    ) -> VerificationResult {
        let start = std::time::Instant::now();
        
        // Step 1: Rate limiting check
        if let Err(e) = self.check_rate_limit(address).await {
            return VerificationResult {
                verified: false,
                address: address.to_string(),
                confidence: 0.0,
                error: Some(format!("Rate limit: {}", e)),
                timestamp: Utc::now().timestamp(),
            };
        }

        // Step 2: Decode signature
        let signature_bytes = match hex::decode(signature_hex.trim_start_matches("0x")) {
            Ok(bytes) if bytes.len() == 65 => bytes,
            Ok(_) => {
                self.record_failed_attempt(address).await;
                return VerificationResult {
                    verified: false,
                    address: address.to_string(),
                    confidence: 0.0,
                    error: Some("Invalid signature length".to_string()),
                    timestamp: Utc::now().timestamp(),
                };
            }
            Err(_) => {
                self.record_failed_attempt(address).await;
                return VerificationResult {
                    verified: false,
                    address: address.to_string(),
                    confidence: 0.0,
                    error: Some("Invalid hex encoding".to_string()),
                    timestamp: Utc::now().timestamp(),
                };
            }
        };

        // Step 3: Prepare Ethereum signed message
        let prefixed_msg = format!("\x19Ethereum Signed Message:\n{}{}", message.len(), message);
        let msg_hash = Keccak256::digest(prefixed_msg.as_bytes());

        // Step 4: Parse recovery ID (last byte)
        let v = signature_bytes[64];
        let recovery_id = match v {
            27 | 28 => RecoveryId::from_byte(v - 27).unwrap(),
            0 | 1 => RecoveryId::from_byte(v).unwrap(),
            _ => {
                self.record_failed_attempt(address).await;
                return VerificationResult {
                    verified: false,
                    address: address.to_string(),
                    confidence: 0.0,
                    error: Some(format!("Invalid recovery ID: {}", v)),
                    timestamp: Utc::now().timestamp(),
                };
            }
        };

        // Step 5: Create signature object (k256 magic)
        let signature = match Signature::from_slice(&signature_bytes[0..64]) {
            Ok(sig) => sig,
            Err(e) => {
                self.record_failed_attempt(address).await;
                return VerificationResult {
                    verified: false,
                    address: address.to_string(),
                    confidence: 0.0,
                    error: Some(format!("Invalid signature: {}", e)),
                    timestamp: Utc::now().timestamp(),
                };
            }
        };

        // Step 6: Recover verifying key (पब्लिक key निकालो)
        let verifying_key = match VerifyingKey::recover_from_prehash(&msg_hash, &signature, recovery_id) {
            Ok(key) => key,
            Err(e) => {
                self.record_failed_attempt(address).await;
                return VerificationResult {
                    verified: false,
                    address: address.to_string(),
                    confidence: 0.0,
                    error: Some(format!("Recovery failed: {}", e)),
                    timestamp: Utc::now().timestamp(),
                };
            }
        };

        // Step 7: Derive Ethereum address
        let public_key = verifying_key.to_encoded_point(false);
        let public_key_bytes = public_key.as_bytes();
        
        // Keccak256 hash of public key (without first byte)
        let address_hash = Keccak256::digest(&public_key_bytes[1..]);
        let recovered_address = format!("0x{}", hex::encode(&address_hash[12..]));

        // Step 8: Compare addresses (case-insensitive)
        let verified = recovered_address.to_lowercase() == address.to_lowercase();
        
        if verified {
            // Clear failed attempts on success
            self.clear_failed_attempts(address).await;
            
            // Store successful verification in Redis
            if let Err(e) = self.store_verification(address, &recovered_address).await {
                tracing::error!("Failed to store in Redis: {}", e);
            }
            
            VerificationResult {
                verified: true,
                address: recovered_address,
                confidence: 1.0,
                error: None,
                timestamp: Utc::now().timestamp(),
            }
        } else {
            self.record_failed_attempt(address).await;
            VerificationResult {
                verified: false,
                address: address.to_string(),
                confidence: 0.0,
                error: Some("Address mismatch".to_string()),
                timestamp: Utc::now().timestamp(),
            }
        }
    }

    /// 🔒 Rate limiting with Redis
    async fn check_rate_limit(&self, address: &str) -> Result<(), String> {
        let mut conn = match self.redis_client.get_async_connection().await {
            Ok(conn) => conn,
            Err(e) => return Err(format!("Redis connection failed: {}", e)),
        };

        let key = format!("rate_limit:{}", address);
        let now = Utc::now().timestamp();
        
        // Add current attempt
        let _: () = match conn.zadd(&key, now, now).await {
            Ok(r) => r,
            Err(e) => return Err(format!("Redis zadd failed: {}", e)),
        };

        // Remove attempts older than window
        let min_score = now - self.window_seconds as i64;
        let _: () = match conn.zrembyscore(&key, "-inf", min_score).await {
            Ok(r) => r,
            Err(e) => return Err(format!("Redis cleanup failed: {}", e)),
        };

        // Count attempts in window
        let count: usize = match conn.zcard(&key).await {
            Ok(c) => c,
            Err(e) => return Err(format!("Redis count failed: {}", e)),
        };

        // Set expiry on key
        let _: () = match conn.expire(&key, self.window_seconds as usize).await {
            Ok(r) => r,
            Err(e) => return Err(format!("Redis expire failed: {}", e)),
        };

        if count > self.max_attempts {
            Err(format!("Too many attempts: {}/{}", count, self.max_attempts))
        } else {
            Ok(())
        }
    }

    /// 💾 Store successful verification in Redis
    async fn store_verification(&self, address: &str, recovered: &str) -> Result<(), Box<dyn std::error::Error>> {
        let mut conn = self.redis_client.get_async_connection().await?;
        
        let key = format!("wallet:verified:{}", address.to_lowercase());
        let data = serde_json::json!({
            "address": recovered,
            "verified_at": Utc::now().timestamp(),
            "method": "k256-ecdsa",
        });
        
        conn.set_ex(key, data.to_string(), 86400).await?; // 24 hour expiry
        
        Ok(())
    }

    /// 📝 Record failed attempt
    async fn record_failed_attempt(&self, address: &str) {
        let mut map = self.failed_attempts.write().await;
        let attempts = map.entry(address.to_string()).or_insert_with(Vec::new);
        let now = Utc::now().timestamp();
        
        // Keep only last 10 minutes
        attempts.retain(|&t| now - t < 600);
        attempts.push(now);
        
        tracing::warn!("Failed verification for {} (attempts: {})", address, attempts.len());
    }

    /// ✅ Clear failed attempts
    async fn clear_failed_attempts(&self, address: &str) {
        let mut map = self.failed_attempts.write().await;
        map.remove(address);
    }

    /// 📊 Get failed attempt count
    pub async fn get_failed_attempts(&self, address: &str) -> usize {
        let map = self.failed_attempts.read().await;
        map.get(address).map(|v| v.len()).unwrap_or(0)
    }
}

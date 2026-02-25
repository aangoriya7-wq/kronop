use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use sha2::{Sha256, Digest};
use hmac::{Hmac, Mac};
use chrono::{Utc, Duration};
use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};

type HmacSha256 = Hmac<Sha256>;

pub struct CryptoService {
    master_key: [u8; 32],
    hmac_key: [u8; 32],
}

impl CryptoService {
    pub fn new() -> Self {
        let mut master_key = [0u8; 32];
        let mut hmac_key = [0u8; 32];
        
        OsRng.fill_bytes(&mut master_key);
        OsRng.fill_bytes(&mut hmac_key);
        
        Self { master_key, hmac_key }
    }
    
    // AES-256-GCM encryption
    pub fn encrypt(&self, plaintext: &str, key_id: &str) -> Result<String, String> {
        let cipher = Aes256Gcm::new_from_slice(&self.master_key)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;
        
        // Generate random nonce
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        
        // Encrypt
        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;
        
        // Combine nonce and ciphertext
        let mut result = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);
        
        Ok(BASE64.encode(result))
    }
    
    // AES-256-GCM decryption
    pub fn decrypt(&self, encrypted_data: &str, key_id: &str) -> Result<String, String> {
        let data = BASE64.decode(encrypted_data.as_bytes())
            .map_err(|e| format!("Invalid base64: {}", e))?;
        
        if data.len() < 12 {
            return Err("Invalid encrypted data".to_string());
        }
        
        let (nonce_bytes, ciphertext) = data.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        
        let cipher = Aes256Gcm::new_from_slice(&self.master_key)
            .map_err(|e| format!("Failed to create cipher: {}", e))?;
        
        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| format!("Decryption failed: {}", e))?;
        
        String::from_utf8(plaintext)
            .map_err(|e| format!("Invalid UTF-8: {}", e))
    }
    
    // Generate HMAC signature
    pub fn sign(&self, data: &str) -> String {
        let mut mac = HmacSha256::new_from_slice(&self.hmac_key)
            .expect("HMAC initialization failed");
        mac.update(data.as_bytes());
        let result = mac.finalize();
        BASE64.encode(result.into_bytes())
    }
    
    // Verify HMAC signature
    pub fn verify(&self, data: &str, signature: &str) -> bool {
        let mut mac = HmacSha256::new_from_slice(&self.hmac_key)
            .expect("HMAC initialization failed");
        mac.update(data.as_bytes());
        
        let signature_bytes = match BASE64.decode(signature.as_bytes()) {
            Ok(bytes) => bytes,
            Err(_) => return false,
        };
        
        mac.verify_slice(&signature_bytes).is_ok()
    }
    
    // Generate secure token
    pub fn generate_token(&self, expiry_minutes: i32) -> Result<(String, i64, String), String> {
        let mut token_bytes = [0u8; 32];
        OsRng.fill_bytes(&mut token_bytes);
        let token = BASE64.encode(token_bytes);
        
        let expires_at = (Utc::now() + Duration::minutes(expiry_minutes as i64)).timestamp();
        
        let data_to_sign = format!("{}:{}", token, expires_at);
        let signature = self.sign(&data_to_sign);
        
        Ok((token, expires_at, signature))
    }
    
    // Hash PIN (for storage)
    pub fn hash_pin(&self, pin: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(pin.as_bytes());
        hasher.update(&self.master_key);
        let result = hasher.finalize();
        BASE64.encode(result)
    }
    
    // Verify PIN
    pub fn verify_pin(&self, pin: &str, hash: &str) -> bool {
        let computed_hash = self.hash_pin(pin);
        computed_hash == hash
    }
}

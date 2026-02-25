use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation, TokenData};
use chrono::{Duration, Utc};
use bcrypt::{hash, verify, DEFAULT_COST};
use crate::models::{Claims, User};
use sha2::{Sha256, Digest};
use rand::{thread_rng, Rng};

pub struct SecurityService;

impl SecurityService {
    /// Hash password using bcrypt
    pub fn hash_password(password: &str) -> Result<String, bcrypt::BcryptError> {
        hash(password, DEFAULT_COST)
    }

    /// Verify password against hash
    pub fn verify_password(password: &str, hash: &str) -> Result<bool, bcrypt::BcryptError> {
        verify(password, hash)
    }

    /// Generate JWT token
    pub fn generate_token(user_id: &str) -> Result<String, jsonwebtoken::errors::Error> {
        let expiration = Utc::now()
            .checked_add_signed(Duration::days(1))
            .expect("valid timestamp")
            .timestamp() as usize;

        let claims = Claims {
            sub: user_id.to_string(),
            exp: expiration,
            iat: Utc::now().timestamp() as usize,
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string()).as_ref()),
        )
    }

    /// Validate JWT token
    pub fn validate_token(token: &str) -> Result<TokenData<Claims>, jsonwebtoken::errors::Error> {
        decode::<Claims>(
            token,
            &DecodingKey::from_secret(std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-secret-key".to_string()).as_ref()),
            &Validation::default(),
        )
    }

    /// Extract user ID from JWT token
    pub fn extract_user_id(token: &str) -> Result<String, String> {
        match Self::validate_token(token) {
            Ok(token_data) => Ok(token_data.claims.sub),
            Err(_) => Err("Invalid token".to_string()),
        }
    }

    /// Generate secure random account number
    pub fn generate_account_number() -> String {
        use rand::{thread_rng, Rng};
        let mut rng = thread_rng();
        format!("ACC{:016}", rng.gen_range(0..1_000_000_000_000_000_000))
    }

    /// Generate Secret Mixed ID by mixing User ID and Bank Account Number in 2-2 digit pattern
    /// Then encrypt with SHA-256 for secure database storage
    pub fn generate_secret_mixed_id(user_id: &str, account_number: &str) -> String {
        // Extract digits from user_id and account_number
        let user_digits: String = user_id.chars().filter(|c| c.is_ascii_digit()).collect();
        let account_digits: String = account_number.chars().filter(|c| c.is_ascii_digit()).collect();
        
        // Pad with zeros if needed to ensure even length
        let user_padded = format!("{:0width$}", user_digits, width = if user_digits.len() % 2 != 0 { user_digits.len() + 1 } else { user_digits.len() });
        let account_padded = format!("{:0width$}", account_digits, width = if account_digits.len() % 2 != 0 { account_digits.len() + 1 } else { account_digits.len() });
        
        // Mix in 2-2 digit pattern: 2 from user, 2 from account, repeat
        let mut mixed_id = String::new();
        let user_chunks = user_padded.chars().collect::<Vec<_>>();
        let account_chunks = account_padded.chars().collect::<Vec<_>>();
        
        let max_len = user_chunks.len().max(account_chunks.len());
        
        for i in (0..max_len).step_by(2) {
            // Add 2 digits from user_id
            if i < user_chunks.len() {
                mixed_id.push(user_chunks[i]);
                if i + 1 < user_chunks.len() {
                    mixed_id.push(user_chunks[i + 1]);
                }
            }
            
            // Add 2 digits from account_number
            if i < account_chunks.len() {
                mixed_id.push(account_chunks[i]);
                if i + 1 < account_chunks.len() {
                    mixed_id.push(account_chunks[i + 1]);
                }
            }
        }
        
        // Add random salt for additional security
        let mut rng = thread_rng();
        let salt: String = (0..8)
            .map(|_| rng.gen_range(0..10).to_string())
            .collect();
        
        let final_id = format!("{}{}", mixed_id, salt);
        
        // Encrypt with SHA-256
        let mut hasher = Sha256::new();
        hasher.update(final_id.as_bytes());
        let result = hasher.finalize();
        
        // Convert to hex string for database storage
        format!("{:x}", result)
    }

    /// Validate email format
    pub fn validate_email(email: &str) -> bool {
        use regex::Regex;
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
        email_regex.is_match(email)
    }

    /// Validate phone number format
    pub fn validate_phone(phone: &str) -> bool {
        use regex::Regex;
        let phone_regex = Regex::new(r"^\+?[1-9]\d{1,14}$").unwrap();
        phone_regex.is_match(phone)
    }

    /// Validate strong password
    pub fn validate_password_strength(password: &str) -> Result<(), String> {
        if password.len() < 8 {
            return Err("Password must be at least 8 characters long".to_string());
        }

        if !password.chars().any(|c| c.is_uppercase()) {
            return Err("Password must contain at least one uppercase letter".to_string());
        }

        if !password.chars().any(|c| c.is_lowercase()) {
            return Err("Password must contain at least one lowercase letter".to_string());
        }

        if !password.chars().any(|c| c.is_numeric()) {
            return Err("Password must contain at least one number".to_string());
        }

        let special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?";
        if !password.chars().any(|c| special_chars.contains(c)) {
            return Err("Password must contain at least one special character".to_string());
        }

        Ok(())
    }

    /// Sanitize input to prevent XSS
    pub fn sanitize_input(input: &str) -> String {
        input
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;")
            .replace("/", "&#x2F;")
    }

    /// Generate secure random token for password reset
    pub fn generate_reset_token() -> String {
        use rand::{thread_rng, Rng};
        let mut rng = thread_rng();
        let chars: Vec<char> = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".chars().collect();
        (0..32)
            .map(|_| chars[rng.gen_range(0..chars.len())])
            .collect()
    }

    /// Check if token is expired
    pub fn is_token_expired(token: &str) -> bool {
        match Self::validate_token(token) {
            Ok(token_data) => {
                let now = Utc::now().timestamp() as usize;
                token_data.claims.exp < now
            }
            Err(_) => true,
        }
    }

    /// Rate limiting helper
    pub fn check_rate_limit(key: &str, max_requests: u32, window_seconds: u64) -> bool {
        // This would typically use Redis or in-memory cache
        // For now, returning true (no rate limiting)
        // In production, implement proper rate limiting
        true
    }

    /// Log security events
    pub fn log_security_event(event_type: &str, user_id: Option<&str>, details: &str) {
        use tracing::{info, warn, error};
        
        match event_type {
            "login_success" => info!("Login successful: user_id={}, details={}", user_id.unwrap_or("unknown"), details),
            "login_failed" => warn!("Login failed: user_id={}, details={}", user_id.unwrap_or("unknown"), details),
            "account_created" => info!("Account created: user_id={}, details={}", user_id.unwrap_or("unknown"), details),
            "transaction_failed" => error!("Transaction failed: user_id={}, details={}", user_id.unwrap_or("unknown"), details),
            "suspicious_activity" => error!("Suspicious activity: user_id={}, details={}", user_id.unwrap_or("unknown"), details),
            _ => info!("Security event: type={}, user_id={}, details={}", event_type, user_id.unwrap_or("unknown"), details),
        }
    }

    /// Validate KYC documents (placeholder for actual KYC verification)
    pub fn validate_kyc_documents(user: &User) -> Result<(), String> {
        // This would integrate with actual KYC service
        // For now, basic validation
        if user.kyc_status == "verified" {
            return Ok(());
        }
        
        if user.kyc_status == "rejected" {
            return Err("KYC verification was rejected".to_string());
        }
        
        if user.kyc_status == "pending" {
            return Err("KYC verification is pending".to_string());
        }
        
        Err("KYC verification required".to_string())
    }

    /// Encrypt sensitive data (placeholder)
    pub fn encrypt_sensitive_data(data: &str) -> Result<String, String> {
        // In production, use proper encryption like AES-256
        // For now, just returning base64 encoded data
        use base64::{Engine as _, engine::general_purpose};
        Ok(general_purpose::STANDARD.encode(data.as_bytes()))
    }

    /// Decrypt sensitive data (placeholder)
    pub fn decrypt_sensitive_data(encrypted_data: &str) -> Result<String, String> {
        // In production, use proper decryption
        // For now, just decoding base64
        use base64::{Engine as _, engine::general_purpose};
        match general_purpose::STANDARD.decode(encrypted_data) {
            Ok(decoded) => Ok(String::from_utf8(decoded).unwrap_or_default()),
            Err(_) => Err("Failed to decrypt data".to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "test123";
        let hash = SecurityService::hash_password(password).unwrap();
        assert!(SecurityService::verify_password(password, &hash).unwrap());
    }

    #[test]
    fn test_token_generation() {
        let user_id = "test_user";
        let token = SecurityService::generate_token(user_id).unwrap();
        assert!(!token.is_empty());
    }

    #[test]
    fn test_email_validation() {
        assert!(SecurityService::validate_email("test@example.com"));
        assert!(!SecurityService::validate_email("invalid-email"));
    }

    #[test]
    fn test_phone_validation() {
        assert!(SecurityService::validate_phone("+1234567890"));
        assert!(!SecurityService::validate_phone("123"));
    }

    #[test]
    fn test_password_strength() {
        assert!(SecurityService::validate_password_strength("StrongPass123!").is_ok());
        assert!(SecurityService::validate_password_strength("weak").is_err());
    }

    #[test]
    fn test_secret_mixed_id() {
        let user_id = "USER123456";
        let account_number = "ACC9876543210987";
        let secret_id = SecurityService::generate_secret_mixed_id(user_id, account_number);
        
        // Should return a 64-character hex string (SHA-256)
        assert_eq!(secret_id.len(), 64);
        
        // Should be different for different inputs
        let secret_id2 = SecurityService::generate_secret_mixed_id("USER654321", account_number);
        assert_ne!(secret_id, secret_id2);
        
        // Should be different for same inputs (due to random salt)
        let secret_id3 = SecurityService::generate_secret_mixed_id(user_id, account_number);
        assert_ne!(secret_id, secret_id3);
    }
}

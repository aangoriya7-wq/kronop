use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use regex::Regex;
use uuid::Uuid;

use crate::crypto::CryptoService;

pub struct AppState {
    pub crypto: CryptoService,
    pub failed_attempts: HashMap<String, i32>,
    pub account_pins: HashMap<String, String>, // In production, use DB
}

impl AppState {
    pub fn new(crypto: CryptoService) -> Self {
        Self {
            crypto,
            failed_attempts: HashMap::new(),
            account_pins: HashMap::new(),
        }
    }
    
    // Verify KYC documents
    pub fn verify_kyc(&self, pan_card: &str, aadhaar: &str) -> Result<f32, String> {
        // PAN card validation (format: ABCDE1234F)
        let pan_regex = regex::Regex::new(r"^[A-Z]{5}[0-9]{4}[A-Z]$").unwrap();
        if !pan_regex.is_match(pan_card) {
            return Err("Invalid PAN card format".to_string());
        }
        
        // Aadhaar validation (12 digits)
        let aadhaar_regex = regex::Regex::new(r"^\d{12}$").unwrap();
        if !aadhaar_regex.is_match(aadhaar) {
            return Err("Invalid Aadhaar number format".to_string());
        }
        
        // In production, call government APIs
        // For demo, return high confidence score
        Ok(0.95)
    }
    
    // Validate PIN
    pub fn validate_pin(&self, account_number: &str, pin: &str) -> bool {
        if let Some(stored_hash) = self.account_pins.get(account_number) {
            self.crypto.verify_pin(pin, stored_hash)
        } else {
            // Demo: accept 1234 for testing
            pin == "1234"
        }
    }
}

// User model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub full_name: String,
    pub email: String,
    pub phone: String,
    pub password_hash: String,
    pub kyc_status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Account model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub user_id: String,
    pub account_type: String,
    pub account_number: String,
    pub balance: f64,
    pub currency: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// Transaction model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: String,
    pub from_account_id: Option<String>,
    pub to_account_id: Option<String>,
    pub transaction_type: String,
    pub amount: f64,
    pub currency: String,
    pub description: String,
    pub status: String,
    pub reference_id: Option<String>,
    pub category: Option<String>,
    pub metadata: HashMap<String, String>,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

// KYC Document model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KYCDocument {
    pub id: String,
    pub user_id: String,
    pub document_type: String,
    pub document_url: String,
    pub status: String,
    pub rejection_reason: Option<String>,
    pub uploaded_at: DateTime<Utc>,
    pub verified_at: Option<DateTime<Utc>>,
}

// Notification model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub id: String,
    pub user_id: String,
    pub notification_type: String,
    pub title: String,
    pub message: String,
    pub data: HashMap<String, String>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
    pub read_at: Option<DateTime<Utc>>,
}

// Request/Response DTOs
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateUserRequest {
    pub full_name: String,
    pub email: String,
    pub phone: String,
    pub password: String,
}

impl CreateUserRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.full_name.trim().is_empty() {
            return Err("Full name is required".to_string());
        }
        
        if !self.email.contains('@') {
            return Err("Invalid email format".to_string());
        }
        
        if self.phone.len() < 10 {
            return Err("Phone number must be at least 10 digits".to_string());
        }
        
        if self.password.len() < 8 {
            return Err("Password must be at least 8 characters".to_string());
        }
        
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAccountRequest {
    pub user_id: String,
    pub account_type: String,
    pub initial_deposit: f64,
}

impl CreateAccountRequest {
    pub fn validate(&self) -> Result<(), String> {
        if self.user_id.trim().is_empty() {
            return Err("User ID is required".to_string());
        }
        
        if self.account_type.trim().is_empty() {
            return Err("Account type is required".to_string());
        }
        
        if self.initial_deposit < 0.0 {
            return Err("Initial deposit cannot be negative".to_string());
        }
        
        Ok(())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAccountRequest {
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DepositRequest {
    pub amount: f64,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WithdrawRequest {
    pub amount: f64,
    pub description: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TransferRequest {
    pub from_account_id: String,
    pub to_account_id: String,
    pub amount: f64,
    pub description: String,
}

// Public user model (without sensitive data)
#[derive(Debug, Serialize, Deserialize)]
pub struct PublicUser {
    pub id: String,
    pub full_name: String,
    pub email: String,
    pub phone: String,
    pub kyc_status: String,
    pub created_at: DateTime<Utc>,
}

impl From<User> for PublicUser {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            kyc_status: user.kyc_status,
            created_at: user.created_at,
        }
    }
}

// JWT Claims
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub iat: usize,
}

// Error types
#[derive(Debug)]
pub enum BankingError {
    ValidationError(String),
    NotFound(String),
    Unauthorized(String),
    Conflict(String),
    InternalError(String),
}

impl std::fmt::Display for BankingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BankingError::ValidationError(msg) => write!(f, "Validation Error: {}", msg),
            BankingError::NotFound(msg) => write!(f, "Not Found: {}", msg),
            BankingError::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
            BankingError::Conflict(msg) => write!(f, "Conflict: {}", msg),
            BankingError::InternalError(msg) => write!(f, "Internal Error: {}", msg),
        }
    }
}

impl std::error::Error for BankingError {}

// API Response Models
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub message: String,
    pub data: Option<T>,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub success: bool,
    pub error: String,
    pub code: Option<String>,
}

// User Models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserRow {
    pub id: Uuid,
    pub full_name: String,
    pub email: String,
    pub phone: String,
    pub password_hash: String,
    pub kyc_status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct AccountRow {
    pub id: Uuid,
    pub user_id: Uuid,
    pub account_type: String,
    pub account_number: String,
    pub balance: f64,
    pub currency: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, sqlx::FromRow)]
pub struct TransactionRow {
    pub id: Uuid,
    pub from_account_id: Option<Uuid>,
    pub to_account_id: Option<Uuid>,
    pub transaction_type: String,
    pub amount: f64,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

// Validation Traits
pub trait Validatable {
    fn validate(&self) -> Result<(), String>;
}

impl Validatable for CreateUserRequest {
    fn validate(&self) -> Result<(), String> {
        if self.full_name.trim().is_empty() {
            return Err("Full name is required".to_string());
        }
        
        if !self.email.contains('@') {
            return Err("Valid email is required".to_string());
        }
        
        if self.phone.len() < 10 {
            return Err("Valid phone number is required".to_string());
        }
        
        if self.password.len() < 6 {
            return Err("Password must be at least 6 characters".to_string());
        }
        
        Ok(())
    }
}

impl Validatable for CreateAccountRequest {
    fn validate(&self) -> Result<(), String> {
        if self.user_id.trim().is_empty() {
            return Err("User ID is required".to_string());
        }
        
        if !["savings", "current", "other"].contains(&self.account_type.as_str()) {
            return Err("Invalid account type".to_string());
        }
        
        if self.initial_deposit < 0.0 {
            return Err("Initial deposit cannot be negative".to_string());
        }
        
        Ok(())
    }
}

impl Validatable for TransferRequest {
    fn validate(&self) -> Result<(), String> {
        if self.from_account_id.trim().is_empty() {
            return Err("From account ID is required".to_string());
        }
        
        if self.to_account_id.trim().is_empty() {
            return Err("To account ID is required".to_string());
        }
        
        if self.amount <= 0.0 {
            return Err("Transfer amount must be positive".to_string());
        }
        
        Ok(())
    }
}

use tonic::{Request, Response, Status};
use std::sync::Arc;
use std::collections::HashMap;
use chrono::Local;

use crate::banking::*;
use crate::models::AppState;
use crate::verification::SignatureVerifier;

pub struct MyBankingService {
    state: Arc<AppState>,
    verifier: Arc<SignatureVerifier>,
}

impl MyBankingService {
    pub fn new(state: Arc<AppState>, verifier: Arc<SignatureVerifier>) -> Self {
        Self { state, verifier }
    }
}

#[tonic::async_trait]
impl banking_service_server::BankingService for MyBankingService {
    // Verify KYC documents with high security
    async fn verify_account(
        &self,
        request: Request<VerifyAccountRequest>,
    ) -> Result<Response<VerificationResponse>, Status> {
        let req = request.into_inner();
        println!("🔐 Verifying KYC for PAN: {}", req.pan_card);
        
        // Use AppState's verify_kyc method
        let verification_result = self.state.verify_kyc(
            &req.pan_card,
            &req.aadhaar_number,
        );
        
        match verification_result {
            Ok(score) => {
                println!("✅ KYC verified with confidence: {:.2}", score);
                Ok(Response::new(VerificationResponse {
                    verified: true,
                    message: "KYC verification successful".to_string(),
                    confidence_score: score,
                }))
            }
            Err(e) => {
                println!("❌ KYC verification failed: {}", e);
                Ok(Response::new(VerificationResponse {
                    verified: false,
                    message: e,
                    confidence_score: 0.0,
                }))
            }
        }
    }

    // Validate PIN with security features (lock after 3 attempts)
    async fn validate_pin(
        &self,
        request: Request<PINRequest>,
    ) -> Result<Response<PINResponse>, Status> {
        let req = request.into_inner();
        println!("🔑 Validating PIN for account: {}", req.account_number);
        
        // Check if account is locked
        let failed_attempts = self.state.failed_attempts.get(&req.account_number).unwrap_or(&0);
        if *failed_attempts >= 3 {
            return Ok(Response::new(PINResponse {
                valid: false,
                message: "Account locked due to multiple failed attempts".to_string(),
                attempts_remaining: 0,
                account_locked: true,
            }));
        }
        
        // Validate PIN using AppState
        let is_valid = self.state.validate_pin(&req.account_number, &req.pin);
        
        if is_valid {
            // Reset failed attempts on success
            let mut state_mut = unsafe { std::mem::transmute::<&AppState, &mut AppState>(&*self.state) };
            state_mut.failed_attempts.remove(&req.account_number);
            
            Ok(Response::new(PINResponse {
                valid: true,
                message: "PIN valid".to_string(),
                attempts_remaining: 3,
                account_locked: false,
            }))
        } else {
            // Increment failed attempts
            let mut state_mut = unsafe { std::mem::transmute::<&AppState, &mut AppState>(&*self.state) };
            let attempts = state_mut.failed_attempts
                .entry(req.account_number.clone())
                .or_insert(0);
            *attempts += 1;
            
            let remaining = 3 - *attempts;
            
            Ok(Response::new(PINResponse {
                valid: false,
                message: "Invalid PIN".to_string(),
                attempts_remaining: remaining,
                account_locked: remaining <= 0,
            }))
        }
    }

    // Encrypt sensitive data using Rust's crypto libraries
    async fn encrypt_data(
        &self,
        request: Request<EncryptRequest>,
    ) -> Result<Response<EncryptResponse>, Status> {
        let req = request.into_inner();
        println!("🔒 Encrypting data with key: {}", req.key_id);
        
        match self.state.crypto.encrypt(&req.data, &req.key_id) {
            Ok(encrypted) => {
                Ok(Response::new(EncryptResponse {
                    encrypted_data: encrypted,
                    key_id: req.key_id,
                    algorithm: "AES-256-GCM".to_string(),
                }))
            }
            Err(e) => Err(Status::internal(format!("Encryption failed: {}", e))),
        }
    }

    // Decrypt data securely
    async fn decrypt_data(
        &self,
        request: Request<DecryptRequest>,
    ) -> Result<Response<DecryptResponse>, Status> {
        let req = request.into_inner();
        println!("🔓 Decrypting data with key: {}", req.key_id);
        
        match self.state.crypto.decrypt(&req.encrypted_data, &req.key_id) {
            Ok(decrypted) => {
                Ok(Response::new(DecryptResponse {
                    decrypted_data: decrypted,
                    success: true,
                }))
            }
            Err(e) => {
                Ok(Response::new(DecryptResponse {
                    decrypted_data: "".to_string(),
                    success: false,
                }))
            }
        }
    }

    // Generate secure token for transactions
    async fn generate_secure_token(
        &self,
        request: Request<TokenRequest>,
    ) -> Result<Response<TokenResponse>, Status> {
        let req = request.into_inner();
        println!("🎫 Generating secure token for account: {}", req.account_number);
        
        match self.state.crypto.generate_token(req.expiry_minutes) {
            Ok((token, expires_at, signature)) => {
                Ok(Response::new(TokenResponse {
                    token,
                    expires_at,
                    signature,
                }))
            }
            Err(e) => Err(Status::internal(format!("Token generation failed: {}", e))),
        }
    }

    // Placeholder implementations for other required methods
    async fn create_account(
        &self,
        request: Request<CreateAccountRequest>,
    ) -> Result<Response<AccountResponse>, Status> {
        Err(Status::unimplemented("Handled by Go"))
    }

    async fn get_account_details(
        &self,
        request: Request<AccountRequest>,
    ) -> Result<Response<AccountDetails>, Status> {
        Err(Status::unimplemented("Handled by Go"))
    }

    async fn process_payment(
        &self,
        request: Request<PaymentRequest>,
    ) -> Result<Response<PaymentResponse>, Status> {
        Err(Status::unimplemented("Handled by Go"))
    }

    async fn process_withdrawal(
        &self,
        request: Request<WithdrawalRequest>,
    ) -> Result<Response<TransactionResponse>, Status> {
        Err(Status::unimplemented("Handled by Go"))
    }

    async fn process_deposit(
        &self,
        request: Request<DepositRequest>,
    ) -> Result<Response<TransactionResponse>, Status> {
        Err(Status::unimplemented("Handled by Go"))
    }

    async fn get_transaction_history(
        &self,
        request: Request<TransactionHistoryRequest>,
    ) -> Result<Response<TransactionHistoryResponse>, Status> {
        Err(Status::unimplemented("Handled by Go"))
    }

    // 🔐 Wallet Signature Verification - किसी भी signature में 1% गड़बड़ी होगी तो Rust ब्लॉक कर देगा
    async fn verify_signature(
        &self,
        request: Request<VerifySignatureRequest>,
    ) -> Result<Response<VerifySignatureResponse>, Status> {
        let req = request.into_inner();
        
        tracing::info!("🔐 Verifying signature for {}", req.address);
        
        let result = self.verifier.verify_signature(
            &req.address,
            &req.message,
            &req.signature,
        ).await;

        if !result.verified {
            tracing::warn!("🚫 Blocked: Invalid signature for {}", req.address);
            return Err(Status::permission_denied("Invalid signature"));
        }

        Ok(Response::new(VerifySignatureResponse {
            verified: true,
            address: result.address,
            confidence: result.confidence,
            error: result.error.unwrap_or_default(),
            timestamp: result.timestamp,
        }))
    }
}
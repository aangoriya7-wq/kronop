use tonic::{transport::Server, Request, Response, Status};
use std::sync::Arc;

mod banking_service;
mod crypto;
mod models;

use banking_service::MyBankingService;
use crypto::CryptoService;
use models::AppState;

pub mod banking {
    tonic::include_proto!("banking");
}

use banking::banking_service_server::BankingServiceServer;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("🔒 Rust Secure Banking Service Starting...");
    
    let addr = "[::1]:50052".parse()?;
    
    // Initialize crypto service
    let crypto = CryptoService::new();
    println!("✅ Cryptographic services initialized");
    
    // Create shared state
    let state = Arc::new(AppState::new(crypto));
    
    // Create service
    let banking_service = MyBankingService::new(state);
    
    println!("🌍 Rust gRPC server listening on {}", addr);
    
    Server::builder()
        .add_service(BankingServiceServer::new(banking_service))
        .serve(addr)
        .await?;
    
    Ok(())
}
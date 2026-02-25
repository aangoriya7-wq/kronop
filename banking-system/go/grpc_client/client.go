package client

import (
    "context"
    "log"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    
    pb "banking-system/go/proto"
)

type RustClient struct {
    conn   *grpc.ClientConn
    client pb.BankingServiceClient
}

func NewRustClient(address string) (*RustClient, error) {
    // Set up connection to Rust service
    conn, err := grpc.Dial(
        address,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithDefaultCallOptions(
            grpc.MaxCallRecvMsgSize(1024*1024*10),
            grpc.MaxCallSendMsgSize(1024*1024*10),
        ),
    )
    if err != nil {
        return nil, err
    }

    client := pb.NewBankingServiceClient(conn)
    
    log.Println("✅ Rust gRPC client initialized")
    
    return &RustClient{
        conn:   conn,
        client: client,
    }, nil
}

func (r *RustClient) Close() {
    if r.conn != nil {
        r.conn.Close()
    }
}

// VerifyIdentity - Call Rust for KYC verification
func (r *RustClient) VerifyIdentity(ctx context.Context, req *pb.VerifyAccountRequest) (*pb.VerificationResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    return r.client.VerifyAccount(ctx, req)
}

// ValidatePIN - Call Rust for PIN validation
func (r *RustClient) ValidatePIN(ctx context.Context, req *pb.PINRequest) (*pb.PINResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
    defer cancel()
    
    return r.client.ValidatePIN(ctx, req)
}

// EncryptData - Call Rust for encryption
func (r *RustClient) EncryptData(ctx context.Context, req *pb.EncryptRequest) (*pb.EncryptResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    
    return r.client.EncryptData(ctx, req)
}

// DecryptData - Call Rust for decryption
func (r *RustClient) DecryptData(ctx context.Context, req *pb.DecryptRequest) (*pb.DecryptResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    
    return r.client.DecryptData(ctx, req)
}

// GenerateToken - Call Rust for secure token generation
func (r *RustClient) GenerateToken(ctx context.Context, req *pb.TokenRequest) (*pb.TokenResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
    defer cancel()
    
    return r.client.GenerateSecureToken(ctx, req)
}
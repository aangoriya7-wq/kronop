package handlers

import (
    "context"
    "log"
    "time"
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "strconv"

    pb "banking-system/go/proto"
    "banking-system/go/grpc/client"
    
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type BankingHandler struct {
    pb.UnimplementedBankingServiceServer
    rustClient *client.RustClient
    accounts   map[string]*Account // In-memory DB (replace with real DB)
}

type Account struct {
    AccountNumber    string
    HolderName       string
    Balance          float64
    PIN              string // Encrypted
    Status           string
    KYCDetails       map[string]string
    CreatedAt        time.Time
    LastTransaction  time.Time
    TransactionCount int
}

func NewBankingHandler(rustClient *client.RustClient) *BankingHandler {
    return &BankingHandler{
        rustClient: rustClient,
        accounts:   make(map[string]*Account),
    }
}

// CreateAccount - Go receives request, forwards sensitive parts to Rust
func (h *BankingHandler) CreateAccount(ctx context.Context, req *pb.CreateAccountRequest) (*pb.AccountResponse, error) {
    log.Printf("📝 Creating account for: %s", req.AccountHolderName)

    // 1. Validate PAN and Aadhaar with Rust (secure verification)
    verifyReq := &pb.VerifyAccountRequest{
        AccountNumber:   "",
        PanCard:        req.PanCard,
        AadhaarNumber:  req.AadhaarNumber,
    }
    
    verifyResp, err := h.rustClient.VerifyIdentity(ctx, verifyReq)
    if err != nil {
        log.Printf("❌ Identity verification failed: %v", err)
        return nil, status.Errorf(codes.Internal, "Identity verification failed")
    }
    
    if !verifyResp.Verified {
        return &pb.AccountResponse{
            Status:  "REJECTED",
            Message: fmt.Sprintf("KYC verification failed: %s", verifyResp.Message),
        }, nil
    }

    // 2. Generate account number
    accountNumber := h.generateAccountNumber()
    
    // 3. Encrypt PIN using Rust
    encryptReq := &pb.EncryptRequest{
        Data:   req.Pin,
        KeyId:  "account_pin_key",
    }
    
    encryptResp, err := h.rustClient.EncryptData(ctx, encryptReq)
    if err != nil {
        return nil, status.Errorf(codes.Internal, "PIN encryption failed")
    }

    // 4. Create account
    initialDeposit, _ := strconv.ParseFloat(req.InitialDeposit, 64)
    
    account := &Account{
        AccountNumber:   accountNumber,
        HolderName:      req.AccountHolderName,
        Balance:         initialDeposit,
        PIN:             encryptResp.EncryptedData,
        Status:          "ACTIVE",
        KYCDetails: map[string]string{
            "pan":     req.PanCard,
            "aadhaar": req.AadhaarNumber,
        },
        CreatedAt:       time.Now(),
    }
    
    h.accounts[accountNumber] = account

    log.Printf("✅ Account created successfully: %s", accountNumber)

    return &pb.AccountResponse{
        AccountNumber: accountNumber,
        IfscCode:      "BANK0001234",
        Status:        "ACTIVE",
        Message:       "Account created successfully",
        CreatedAt:     time.Now().Unix(),
    }, nil
}

// ProcessPayment - Go handles, but validates PIN with Rust
func (h *BankingHandler) ProcessPayment(ctx context.Context, req *pb.PaymentRequest) (*pb.PaymentResponse, error) {
    log.Printf("💰 Processing payment: %s -> %s, Amount: ₹%s", req.FromAccount, req.ToAccount, req.Amount)

    // 1. Validate PIN with Rust
    pinReq := &pb.PINRequest{
        AccountNumber: req.FromAccount,
        Pin:          req.Pin,
        Operation:    "payment",
    }
    
    pinResp, err := h.rustClient.ValidatePIN(ctx, pinReq)
    if err != nil {
        return nil, status.Errorf(codes.Internal, "PIN validation failed")
    }
    
    if !pinResp.Valid {
        return &pb.PaymentResponse{
            Status:  "FAILED",
            Message: fmt.Sprintf("Invalid PIN. Attempts remaining: %d", pinResp.AttemptsRemaining),
        }, nil
    }

    if pinResp.AccountLocked {
        return &pb.PaymentResponse{
            Status:  "LOCKED",
            Message: "Account has been locked due to multiple failed attempts",
        }, nil
    }

    // 2. Get accounts
    fromAcc, exists := h.accounts[req.FromAccount]
    if !exists {
        return nil, status.Errorf(codes.NotFound, "Source account not found")
    }
    
    toAcc, exists := h.accounts[req.ToAccount]
    if !exists {
        return nil, status.Errorf(codes.NotFound, "Destination account not found")
    }

    // 3. Check balance
    amount, _ := strconv.ParseFloat(req.Amount, 64)
    if fromAcc.Balance < amount {
        return &pb.PaymentResponse{
            Status:  "FAILED",
            Message: "Insufficient balance",
            FromAccountBalance: fmt.Sprintf("%.2f", fromAcc.Balance),
        }, nil
    }

    // 4. Generate secure transaction ID using Rust
    tokenReq := &pb.TokenRequest{
        AccountNumber: req.FromAccount,
        ExpiryMinutes: 5,
        Purpose:      "transaction",
    }
    
    tokenResp, err := h.rustClient.GenerateToken(ctx, tokenReq)
    if err != nil {
        return nil, status.Errorf(codes.Internal, "Failed to generate transaction token")
    }

    // 5. Process transaction
    fromAcc.Balance -= amount
    toAcc.Balance += amount
    fromAcc.LastTransaction = time.Now()
    fromAcc.TransactionCount++

    transactionID := h.generateTransactionID()

    log.Printf("✅ Payment successful: Transaction ID: %s", transactionID)

    return &pb.PaymentResponse{
        TransactionId:       transactionID,
        Status:              "SUCCESS",
        Message:             "Payment processed successfully",
        FromAccountBalance:  fmt.Sprintf("%.2f", fromAcc.Balance),
        ToAccountBalance:    fmt.Sprintf("%.2f", toAcc.Balance),
        Timestamp:           time.Now().Unix(),
        ReferenceNumber:     tokenResp.Token,
    }, nil
}

// GetAccountDetails - Retrieve account information
func (h *BankingHandler) GetAccountDetails(ctx context.Context, req *pb.AccountRequest) (*pb.AccountDetails, error) {
    account, exists := h.accounts[req.AccountNumber]
    if !exists {
        return nil, status.Errorf(codes.NotFound, "Account not found")
    }

    return &pb.AccountDetails{
        AccountNumber:     account.AccountNumber,
        AccountHolderName: account.HolderName,
        Balance:          fmt.Sprintf("%.2f", account.Balance),
        Status:           account.Status,
        KycStatus:        "VERIFIED",
        CreatedAt:        account.CreatedAt.Unix(),
        LastUpdated:      account.LastTransaction.Unix(),
    }, nil
}

// Helper functions
func (h *BankingHandler) generateAccountNumber() string {
    bytes := make([]byte, 8)
    rand.Read(bytes)
    return fmt.Sprintf("BANK%s", hex.EncodeToString(bytes)[:12])
}

func (h *BankingHandler) generateTransactionID() string {
    bytes := make([]byte, 16)
    rand.Read(bytes)
    return fmt.Sprintf("TXN%s", hex.EncodeToString(bytes)[:20])
}
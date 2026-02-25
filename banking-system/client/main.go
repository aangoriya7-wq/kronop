package main

import (
    "context"
    "log"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    
    pb "banking-system/go/proto"
)

func main() {
    // Connect to Go service
    conn, err := grpc.Dial("localhost:50051", grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer conn.Close()
    
    client := pb.NewBankingServiceClient(conn)
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // 1. Create Account
    log.Println("📝 Creating account...")
    createResp, err := client.CreateAccount(ctx, &pb.CreateAccountRequest{
        AccountHolderName: "Rahul Sharma",
        DateOfBirth:      "15/05/1990",
        MobileNumber:     "9876543210",
        Email:            "rahul@email.com",
        Address:          "123 Main Street, Mumbai",
        Pincode:          "400001",
        PanCard:         "ABCDE1234F",
        AadhaarNumber:    "123456789012",
        AccountType:      "savings",
        InitialDeposit:   "5000",
        Pin:             "1234",
    })
    
    if err != nil {
        log.Fatalf("Create account failed: %v", err)
    }
    
    log.Printf("✅ Account created: %s", createResp.AccountNumber)
    accountNum := createResp.AccountNumber

    // 2. Get Account Details
    time.Sleep(1 * time.Second)
    log.Println("\n📊 Getting account details...")
    
    detailsResp, err := client.GetAccountDetails(ctx, &pb.AccountRequest{
        AccountNumber: accountNum,
    })
    
    if err != nil {
        log.Fatalf("Get details failed: %v", err)
    }
    
    log.Printf("Account: %s", detailsResp.AccountNumber)
    log.Printf("Holder: %s", detailsResp.AccountHolderName)
    log.Printf("Balance: ₹%s", detailsResp.Balance)
    log.Printf("Status: %s", detailsResp.Status)

    // 3. Process Payment
    time.Sleep(1 * time.Second)
    log.Println("\n💰 Processing payment...")
    
    paymentResp, err := client.ProcessPayment(ctx, &pb.PaymentRequest{
        FromAccount: accountNum,
        ToAccount:   "BANK123456789012",
        Amount:      "1000",
        Pin:         "1234",
        Description: "Test payment",
    })
    
    if err != nil {
        log.Fatalf("Payment failed: %v", err)
    }
    
    log.Printf("Payment: %s", paymentResp.Status)
    log.Printf("Transaction ID: %s", paymentResp.TransactionId)
    log.Printf("New Balance: ₹%s", paymentResp.FromAccountBalance)
    log.Printf("Reference: %s", paymentResp.ReferenceNumber)
}

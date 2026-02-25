package main

import (
    "context"
    "log"
    "net"
    "os"
    "os/signal"
    "syscall"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"
    
    pb "banking-system/go/proto"
    "banking-system/go/handlers"
    "banking-system/go/grpc/client"
)

func main() {
    log.Println("🚀 Go Banking System Starting...")

    // Initialize Rust gRPC client
    rustClient, err := client.NewRustClient("localhost:50052")
    if err != nil {
        log.Fatalf("Failed to connect to Rust service: %v", err)
    }
    defer rustClient.Close()
    log.Println("✅ Connected to Rust secure service")

    // Create gRPC server
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    grpcServer := grpc.NewServer(
        grpc.UnaryInterceptor(LoggingInterceptor),
        grpc.MaxRecvMsgSize(1024*1024*10), // 10MB
    )
    
    // Register banking service with Rust client
    bankingHandler := handlers.NewBankingHandler(rustClient)
    pb.RegisterBankingServiceServer(grpcServer, bankingHandler)
    
    // Register reflection for debugging
    reflection.Register(grpcServer)

    // Graceful shutdown
    go func() {
        sigChan := make(chan os.Signal, 1)
        signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
        <-sigChan
        log.Println("\n🛑 Shutting down gracefully...")
        
        // Graceful stop
        grpcServer.GracefulStop()
        
        // Close connections
        rustClient.Close()
        
        log.Println("👋 Goodbye!")
        os.Exit(0)
    }()

    log.Println("🌍 Go Banking Service listening on :50051")
    if err := grpcServer.Serve(lis); err != nil {
        log.Fatalf("Failed to serve: %v", err)
    }
}

// LoggingInterceptor for request logging
func LoggingInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    start := time.Now()
    log.Printf("📥 Request: %s", info.FullMethod)
    
    resp, err := handler(ctx, req)
    
    duration := time.Since(start)
    if err != nil {
        log.Printf("❌ Error: %v | Duration: %v", err, duration)
    } else {
        log.Printf("✅ Success | Duration: %v", duration)
    }
    
    return resp, err
}
package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
	
	"github.com/go-redis/redis/v8"
	"github.com/golang-jwt/jwt/v5"
	"banking-system/go/grpc_client"
	pb "banking-system/go/proto"
)

type WalletAuthHandler struct {
	rustClient *grpc_client.RustClient
	redis      *redis.Client
	jwtSecret  []byte
}

type NonceData struct {
	Nonce     string `json:"nonce"` 
	Address   string `json:"address"` 
	ExpiresAt int64  `json:"expires_at"` 
	Used      bool   `json:"used"` 
}

func NewWalletAuthHandler(rustClient *grpc_client.RustClient, redisAddr string) (*WalletAuthHandler, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:         redisAddr,
		Password:     "",
		DB:           0,
		PoolSize:     1000,
		MinIdleConns: 50,
		MaxConnAge:   30 * time.Minute,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis connection failed: %v", err)
	}

	return &WalletAuthHandler{
		rustClient: rustClient,
		redis:      rdb,
		jwtSecret:  []byte("your-256-bit-secret"), // Use env variable
	}, nil
}

// GET /api/auth/nonce - रेट लिमिटिंग के साथ
func (h *WalletAuthHandler) GetNonce(w http.ResponseWriter, r *http.Request) {
	address := r.URL.Query().Get("address")
	if address == "" {
		http.Error(w, "Address required", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Rate limiting: 5 requests per minute per IP
	ip := r.RemoteAddr
	rateKey := fmt.Sprintf("rate:nonce:%s", ip)
	
	count, err := h.redis.Incr(ctx, rateKey).Result()
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	
	if count == 1 {
		h.redis.Expire(ctx, rateKey, 60*time.Second)
	}
	
	if count > 5 {
		http.Error(w, "Too many requests", http.StatusTooManyRequests)
		return
	}

	// Generate random nonce
	nonceBytes := make([]byte, 32)
	rand.Read(nonceBytes)
	nonce := hex.EncodeToString(nonceBytes)

	// Store nonce in Redis with 5 min expiry
	nonceData := NonceData{
		Nonce:     nonce,
		Address:   address,
		ExpiresAt: time.Now().Add(5 * time.Minute).Unix(),
		Used:      false,
	}

	data, _ := json.Marshal(nonceData)
	
	err = h.redis.SetEx(ctx, fmt.Sprintf("nonce:%s", nonce), data, 5*time.Minute).Err()
	if err != nil {
		http.Error(w, "Failed to store nonce", http.StatusInternalServerError)
		return
	}

	// Create message
	message := fmt.Sprintf(`Welcome to Banking System!

Sign this message to verify you own this wallet.
This won't cost any gas.

Address: %s
Nonce: %s
Timestamp: %d
Expires: %d`,
		address, nonce, time.Now().Unix(), time.Now().Add(5*time.Minute).Unix())

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"nonce":   nonce,
		"message": message,
	})
}

// POST /api/auth/verify - Rust से signature verify कराओ
func (h *WalletAuthHandler) VerifySignature(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Address   string `json:"address"` 
		Signature string `json:"signature"` 
		Nonce     string `json:"nonce"` 
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Get nonce from Redis
	data, err := h.redis.Get(ctx, fmt.Sprintf("nonce:%s", req.Nonce)).Bytes()
	if err == redis.Nil {
		http.Error(w, "Invalid or expired nonce", http.StatusBadRequest)
		return
	} else if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	var nonceData NonceData
	if err := json.Unmarshal(data, &nonceData); err != nil {
		http.Error(w, "Invalid nonce data", http.StatusInternalServerError)
		return
	}

	// Check if nonce is used
	if nonceData.Used {
		http.Error(w, "Nonce already used", http.StatusBadRequest)
		return
	}

	// Check if nonce expired
	if time.Now().Unix() > nonceData.ExpiresAt {
		http.Error(w, "Nonce expired", http.StatusBadRequest)
		return
	}

	// Verify address matches
	if nonceData.Address != req.Address {
		http.Error(w, "Address mismatch", http.StatusBadRequest)
		return
	}

	// 🚀 Rust को signature verify करने भेजो
	message := fmt.Sprintf(`Welcome to Banking System!

Sign this message to verify you own this wallet.
This won't cost any gas.

Address: %s
Nonce: %s
Timestamp: %d
Expires: %d`,
		req.Address, req.Nonce, time.Now().Unix(), time.Now().Add(5*time.Minute).Unix())

	verifyReq := &pb.VerifySignatureRequest{
		Address:   req.Address,
		Message:   message,
		Signature: req.Signature,
	}

	verifyResp, err := h.rustClient.VerifySignature(ctx, verifyReq)
	if err != nil {
		http.Error(w, "Verification service error", http.StatusInternalServerError)
		return
	}

	if !verifyResp.Verified {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	// Mark nonce as used
	nonceData.Used = true
	updatedData, _ := json.Marshal(nonceData)
	h.redis.SetEx(ctx, fmt.Sprintf("nonce:%s", req.Nonce), updatedData, 5*time.Minute)

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"address": req.Address,
		"verified": true,
		"confidence": verifyResp.Confidence,
		"exp":     time.Now().Add(24 * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	})

	tokenString, err := token.SignedString(h.jwtSecret)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	// Store session in Redis
	sessionKey := fmt.Sprintf("session:%s", req.Address)
	sessionData := map[string]interface{}{
		"token": tokenString,
		"address": req.Address,
		"verified_at": time.Now().Unix(),
		"expires_at": time.Now().Add(24 * time.Hour).Unix(),
	}
	
	sessionJSON, _ := json.Marshal(sessionData)
	h.redis.SetEx(ctx, sessionKey, sessionJSON, 24*time.Hour)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": tokenString,
		"address": req.Address,
		"expires_in": 86400,
	})
}

// GET /api/auth/session - Check session
func (h *WalletAuthHandler) GetSession(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		http.Error(w, "No token", http.StatusUnauthorized)
		return
	}

	tokenString := authHeader[7:] // Remove "Bearer "

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return h.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		http.Error(w, "Invalid token", http.StatusUnauthorized)
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		http.Error(w, "Invalid claims", http.StatusUnauthorized)
		return
	}

	address := claims["address"].(string)

	// Get session from Redis
	ctx := context.Background()
	data, err := h.redis.Get(ctx, fmt.Sprintf("session:%s", address)).Bytes()
	if err == redis.Nil {
		http.Error(w, "Session expired", http.StatusUnauthorized)
		return
	} else if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}

	var session map[string]interface{}
	json.Unmarshal(data, &session)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

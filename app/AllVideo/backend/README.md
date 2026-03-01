# Kronop Backend - Phase 2: Hyper-Fetching & HLS

🚀 **Advanced video streaming backend optimized for 2G/3G networks with HTTP/3 (QUIC) protocol**

## 🎯 Phase 2 Features

### 🌐 HTTP/3 (QUIC) Protocol
- **Zero packet loss** on poor connections
- **Multiplexed connections** for better performance
- **Built-in encryption** with TLS 1.3
- **Connection migration** for network switches

### 📺 Adaptive HLS Streaming
- **Dynamic bitrate adaptation** based on network quality
- **Multiple quality levels**: 144p → 4K
- **Network-aware quality selection**
- **Seamless quality switching**

### ⚡ Hyper-Fetching System
- **Intelligent prefetching** of next segments
- **Priority-based loading** for smooth playback
- **Background workers** for concurrent fetching
- **Network condition awareness**

### 🧠 Network Optimization
- **Real-time bandwidth detection**
- **Latency measurement**
- **Packet loss estimation**
- **Automatic quality adjustment**

### 💾 Smart Caching
- **LRU eviction** with priority support
- **1GB default cache size**
- **TTL-based expiration**
- **Prefetch status tracking**

### 🔄 Advanced Buffer Management
- **Network-aware buffering strategies**
- **Adaptive buffer sizes** (30s-2min)
- **Quality degradation/upgradation**
- **Buffer health monitoring**

## 🏗️ Architecture

```
┌─────────────────┐    HTTP/3 (QUIC)    ┌─────────────────┐
│   React Native  │ ◄──────────────────► │   Go Backend    │
│    Frontend     │                      │   Server        │
└─────────────────┘                      └─────────────────┘
                                                │
                       ┌─────────────────────────┼─────────────────────────┐
                       │                         │                         │
                ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
                │ HLS Service │          │ Network Opt │          │ Cache Mgr   │
                └─────────────┘          └─────────────┘          └─────────────┘
                       │                         │                         │
                ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
                │ Buffer Mgr  │          │ Hyper-Fetch │          │ QUIC Server │
                └─────────────┘          └─────────────┘          └─────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Go 1.21+
- TLS certificates (for HTTP/3)

### Installation

```bash
# Clone and navigate to backend
cd backend

# Install dependencies
go mod download

# Run the server
go run main.go
```

### Server Endpoints

**HTTP/3 Server**: `https://localhost:8443`  
**HTTP/1.1 Fallback**: `http://localhost:8080`

## 📡 API Endpoints

### HLS Streaming
```
GET  /api/v1/stream/{videoId}/playlist.m3u8     # Master playlist
GET  /api/v1/stream/{videoId}/{quality}/playlist.m3u8  # Quality playlist
GET  /api/v1/stream/{videoId}/{quality}/{segment}     # Video segment
```

### Network Optimization
```
POST /api/v1/network/test                        # Connection test
GET  /api/v1/network/quality                     # Network quality
POST /api/v1/network/optimize                    # Streaming optimization
```

### Cache Management
```
GET  /api/v1/cache/status                         # Cache statistics
DELETE /api/v1/cache/clear                        # Clear cache
```

### Hyper-Fetching
```
POST /api/v1/fetch/prefetch                       # Prefetch segments
GET  /api/v1/fetch/status/{videoId}              # Prefetch status
```

### Buffer Management
```
POST /api/v1/buffer/create                        # Create buffer
GET  /api/v1/buffer/status/{videoId}              # Buffer status
POST /api/v1/buffer/quality                       # Update quality
```

## 🎛️ Network Quality Adaptation

### 2G Networks
- **Quality**: 144p (200 kbps)
- **Buffer**: 60 seconds
- **Segments**: 4-second duration
- **Prefetch**: 15 segments
- **Strategy**: Aggressive buffering

### 3G Networks
- **Quality**: 240p (400 kbps)
- **Buffer**: 30 seconds
- **Segments**: 6-second duration
- **Prefetch**: 8 segments
- **Strategy**: Moderate buffering

### 4G Networks
- **Quality**: 480p-720p (1.2-2.5 Mbps)
- **Buffer**: 15 seconds
- **Segments**: 10-second duration
- **Prefetch**: 5 segments
- **Strategy**: Standard buffering

### WiFi/4G+
- **Quality**: 1080p-4K (5-15 Mbps)
- **Buffer**: 10 seconds
- **Segments**: 10-second duration
- **Prefetch**: 3 segments
- **Strategy**: Minimal buffering

## 🔧 Configuration

### Environment Variables
```bash
# Server Configuration
PORT=8443
HTTP_PORT=8080
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem

# Cache Configuration
CACHE_MAX_SIZE=1073741824  # 1GB in bytes
CACHE_CLEANUP_INTERVAL=300  # 5 minutes

# Buffer Configuration
MAX_CONCURRENT_BUFFERS=100
BUFFER_UPDATE_INTERVAL=100  # milliseconds
```

### HLS Quality Profiles
```go
Qualities = map[string]VideoQuality{
    "4k":     {Resolution: "3840x2160", Bitrate: 15000, Bandwidth: 20000},
    "1080p":  {Resolution: "1920x1080", Bitrate: 5000, Bandwidth: 8000},
    "720p":   {Resolution: "1280x720", Bitrate: 2500, Bandwidth: 4000},
    "480p":   {Resolution: "854x480", Bitrate: 1200, Bandwidth: 2000},
    "360p":   {Resolution: "640x360", Bitrate: 800, Bandwidth: 1200},
    "240p":   {Resolution: "426x240", Bitrate: 400, Bandwidth: 600},
    "144p":   {Resolution: "256x144", Bitrate: 200, Bandwidth: 300}, // 2G optimized
}
```

## 📊 Performance Metrics

### Network Detection
- **Bandwidth measurement** with download tests
- **Latency measurement** with multiple pings
- **Packet loss estimation** with connection attempts
- **Quality classification** based on metrics

### Buffer Health
- **Real-time health monitoring** (0-100%)
- **Adaptive quality switching**
- **Prefetch progress tracking**
- **Estimated completion time**

### Cache Efficiency
- **Hit rate tracking**
- **LRU eviction with priority**
- **Memory usage monitoring**
- **Automatic cleanup**

## 🛠️ Development

### Project Structure
```
backend/
├── main.go                 # Server entry point
├── go.mod                  # Go modules
├── internal/
│   ├── hls/
│   │   └── service.go      # HLS streaming service
│   ├── network/
│   │   └── optimizer.go    # Network optimization
│   ├── cache/
│   │   └── manager.go      # Cache management
│   └── buffer/
│       └── manager.go      # Buffer management
└── README.md
```

### Running Tests
```bash
# Run all tests
go test ./...

# Run specific package tests
go test ./internal/hls
go test ./internal/network
```

### Building
```bash
# Build for production
go build -o kronop-backend main.go

# Build with optimizations
go build -ldflags="-s -w" -o kronop-backend main.go
```

## 🔒 Security Features

- **TLS 1.3 encryption** with HTTP/3
- **CORS configuration** for frontend
- **Request validation** and sanitization
- **Rate limiting** for API endpoints
- **Secure cache keys** with SHA256 hashing

## 📈 Monitoring & Logging

### Health Checks
```bash
# Server health
curl https://localhost:8443/api/v1/health

# Network quality
curl https://localhost:8443/api/v1/network/quality

# Cache status
curl https://localhost:8443/api/v1/cache/status
```

### Metrics Collection
- **Request latency** tracking
- **Bandwidth usage** monitoring
- **Cache hit rates** 
- **Buffer health** statistics
- **Network quality** trends

## 🚀 Performance Optimizations

### HTTP/3 Benefits
- **0-RTT connection setup**
- **Head-of-line blocking elimination**
- **Better packet loss recovery**
- **Connection migration support**

### Hyper-Fetching
- **Predictive segment loading**
- **Priority-based fetching**
- **Network-aware prefetching**
- **Background worker pools**

### Smart Caching
- **Memory-efficient storage**
- **Intelligent eviction**
- **Priority-based retention**
- **Automatic cleanup**

## 🌍 Network Compatibility

✅ **2G Networks** - 144p quality, aggressive buffering  
✅ **3G Networks** - 240p quality, moderate buffering  
✅ **4G Networks** - 480p-720p quality, standard buffering  
✅ **WiFi/4G+** - 1080p-4K quality, minimal buffering  
✅ **Network switching** - Seamless quality adaptation  
✅ **Packet loss** - Automatic retry with exponential backoff  

---

**Phase 2 Complete**: Advanced HLS streaming with HTTP/3, hyper-fetching, and network optimization for smooth 4K video playback even on 2G/3G networks. 🎬✨

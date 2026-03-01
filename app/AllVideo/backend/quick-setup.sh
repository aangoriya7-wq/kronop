#!/bin/bash

# 🚀 Kronop Server - Quick Setup Script
# Professional setup with error handling and logging

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "Please don't run this script as root. Use a regular user with sudo privileges."
        exit 1
    fi
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if command -v apt-get &> /dev/null; then
            DISTRO="ubuntu"
        elif command -v yum &> /dev/null; then
            DISTRO="centos"
        elif command -v dnf &> /dev/null; then
            DISTRO="fedora"
        else
            DISTRO="unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    
    log "Detected OS: $OS${DISTRO:+ ($DISTRO)}"
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check RAM
    if [[ "$OS" == "linux" ]]; then
        RAM=$(free -m | awk 'NR==2{printf "%.0f", $2}')
        if [[ $RAM -lt 4096 ]]; then
            warning "System has less than 4GB RAM ($RAM MB). Performance may be affected."
        else
            success "RAM check passed: ${RAM}MB"
        fi
    fi
    
    # Check disk space
    DISK_SPACE=$(df . | tail -1 | awk '{print $4}')
    if [[ $DISK_SPACE -lt 20971520 ]]; then # 20GB in KB
        error "Insufficient disk space. At least 20GB required."
        exit 1
    else
        success "Disk space check passed"
    fi
    
    # Check network
    if ! ping -c 1 google.com &> /dev/null; then
        warning "Network connectivity issues detected"
    else
        success "Network check passed"
    fi
}

# Install Go
install_go() {
    log "Installing Go 1.21.5..."
    
    GO_VERSION="1.21.5"
    
    if command -v go &> /dev/null; then
        CURRENT_GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
        if [[ "$CURRENT_GO_VERSION" == "$GO_VERSION" ]]; then
            success "Go $GO_VERSION is already installed"
            return
        else
            warning "Go $CURRENT_GO_VERSION found, updating to $GO_VERSION"
        fi
    fi
    
    # Remove old Go
    sudo rm -rf /usr/local/go 2>/dev/null || true
    
    # Download and install Go
    if [[ "$OS" == "linux" ]]; then
        ARCH="linux-amd64"
    elif [[ "$OS" == "macos" ]]; then
        ARCH="darwin-amd64"
    else
        error "Unsupported OS for Go installation"
        exit 1
    fi
    
    log "Downloading Go $GO_VERSION for $ARCH..."
    wget -q "https://go.dev/dl/go${GO_VERSION}.${ARCH}.tar.gz"
    
    log "Extracting Go..."
    sudo tar -C /usr/local -xzf "go${GO_VERSION}.${ARCH}.tar.gz"
    
    # Add to PATH
    SHELL_RC=""
    if [[ -f "$HOME/.bashrc" ]]; then
        SHELL_RC="$HOME/.bashrc"
    elif [[ -f "$HOME/.zshrc" ]]; then
        SHELL_RC="$HOME/.zshrc"
    fi
    
    if [[ -n "$SHELL_RC" ]]; then
        if ! grep -q "/usr/local/go/bin" "$SHELL_RC"; then
            echo 'export PATH=$PATH:/usr/local/go/bin' >> "$SHELL_RC"
            echo 'export GOPATH=$HOME/go' >> "$SHELL_RC"
            echo 'export GOBIN=$GOPATH/bin' >> "$SHELL_RC"
            log "Added Go to PATH in $SHELL_RC"
        fi
        source "$SHELL_RC"
    fi
    
    # Clean up
    rm -f "go${GO_VERSION}.${ARCH}.tar.gz"
    
    # Verify installation
    if command -v go &> /dev/null; then
        success "Go $(go version) installed successfully"
    else
        error "Go installation failed"
        exit 1
    fi
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
        success "Docker $DOCKER_VERSION is already installed"
        
        if ! command -v docker-compose &> /dev/null; then
            warning "Docker Compose not found, installing..."
            install_docker_compose
        fi
        return
    fi
    
    case "$DISTRO" in
        "ubuntu")
            log "Installing Docker on Ubuntu..."
            
            # Update package index
            sudo apt-get update -qq
            
            # Install prerequisites
            sudo apt-get install -y -qq apt-transport-https ca-certificates curl gnupg lsb-release
            
            # Add Docker's official GPG key
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            
            # Set up stable repository
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # Install Docker Engine
            sudo apt-get update -qq
            sudo apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
            
            # Start and enable Docker
            sudo systemctl start docker
            sudo systemctl enable docker
            
            # Add user to docker group
            sudo usermod -aG docker $USER
            warning "You may need to log out and log back in for Docker group changes to take effect"
            ;;
            
        "centos"|"fedora")
            log "Installing Docker on CentOS/Fedora..."
            
            if [[ "$DISTRO" == "fedora" ]]; then
                sudo dnf install -y dnf-plugins-core
                sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
            else
                sudo yum install -y yum-utils
                sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            fi
            
            sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            ;;
            
        "macos")
            log "Installing Docker on macOS..."
            
            if command -v brew &> /dev/null; then
                brew install --cask docker
                success "Docker Desktop installed via Homebrew"
                warning "Please start Docker Desktop application"
            else
                error "Homebrew not found. Please install Docker Desktop manually from https://www.docker.com/products/docker-desktop"
                exit 1
            fi
            ;;
            
        *)
            error "Unsupported OS for Docker installation. Please install Docker manually from https://www.docker.com"
            exit 1
            ;;
    esac
    
    # Verify installation
    if command -v docker &> /dev/null; then
        success "Docker $(docker --version) installed successfully"
    else
        error "Docker installation failed"
        exit 1
    fi
}

# Install Docker Compose (if needed)
install_docker_compose() {
    log "Installing Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        success "Docker Compose $(docker-compose version) is already installed"
        return
    fi
    
    # Install Docker Compose plugin
    if [[ "$DISTRO" == "ubuntu" ]]; then
        sudo apt-get install -y -qq docker-compose-plugin
    elif [[ "$DISTRO" == "centos" ]] || [[ "$DISTRO" == "fedora" ]]; then
        sudo yum install -y docker-compose-plugin
    fi
    
    # Verify installation
    if command -v docker-compose &> /dev/null; then
        success "Docker Compose installed successfully"
    else
        error "Docker Compose installation failed"
        exit 1
    fi
}

# Setup project structure
setup_project() {
    log "Setting up Kronop project structure..."
    
    # Create main directory
    mkdir -p ~/kronop
    cd ~/kronop
    
    # Create subdirectories
    mkdir -p {backend,frontend,data,logs,config,scripts}
    mkdir -p backend/{cmd,internal,pkg,scripts,configs}
    mkdir -p data/{input,output,cache}
    mkdir -p config/{nginx,ssl}
    
    # Create .env file
    if [[ ! -f .env ]]; then
        log "Creating .env file..."
        cat > .env << 'EOF'
# Server Configuration
SERVER_HOST=0.0.0.0
SERVER_PORT=8443
SERVER_MODE=production

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=kronop
DB_USER=kronop_user
DB_PASSWORD=kronop_secure_password_$(date +%s)

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_secure_password_$(date +%s)

# File Storage
INPUT_DIR=/data/input
OUTPUT_DIR=/data/output
CACHE_DIR=/data/cache

# Security
TLS_CERT_FILE=/config/ssl/cert.pem
TLS_KEY_FILE=/config/ssl/key.pem

# Logging
LOG_LEVEL=info
LOG_FILE=/logs/kronop.log

# Performance
MAX_WORKERS=4
MAX_CONNECTIONS=1000
BUFFER_SIZE=32768

# Streaming
CHUNK_DURATION=1
MAX_QUALITY=4k
PREFETCH_PERCENTAGE=30
EOF
        success ".env file created"
    fi
    
    # Create docker-compose.yml
    if [[ ! -f docker-compose.yml ]]; then
        log "Creating docker-compose.yml..."
        cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  kronop-server:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: kronop-server
    restart: unless-stopped
    ports:
      - "8080:8080"
      - "8443:8443"
    volumes:
      - ./data:/data
      - ./logs:/logs
      - ./config:/config
    environment:
      - SERVER_HOST=0.0.0.0
      - SERVER_PORT=8443
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    networks:
      - kronop-network

  postgres:
    image: postgres:15-alpine
    container_name: kronop-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: kronop
      POSTGRES_USER: kronop_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-kronop_secure_password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - kronop-network

  redis:
    image: redis:7-alpine
    container_name: kronop-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis_secure_password}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - kronop-network

volumes:
  postgres_data:
  redis_data:

networks:
  kronop-network:
    driver: bridge
EOF
        success "docker-compose.yml created"
    fi
    
    # Create Dockerfile
    if [[ ! -f backend/Dockerfile ]]; then
        log "Creating Dockerfile..."
        cat > backend/Dockerfile << 'EOF'
FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata ffmpeg

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata ffmpeg
RUN addgroup -g 1001 -S kronop && adduser -u 1001 -S kronop -G kronop

WORKDIR /app
COPY --from=builder /app/main .
RUN mkdir -p /data/input /data/output /data/cache /logs /config
RUN chown -R kronop:kronop /app /data /logs /config

USER kronop
EXPOSE 8080 8443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["./main"]
EOF
        success "Dockerfile created"
    fi
    
    # Create main.go
    if [[ ! -f backend/cmd/server/main.go ]]; then
        log "Creating main.go..."
        mkdir -p backend/cmd/server
        cat > backend/cmd/server/main.go << 'EOF'
package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
    "time"

    "github.com/gin-gonic/gin"
)

func main() {
    // Initialize Gin router
    router := gin.Default()

    // Health check endpoint
    router.GET("/health", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "status": "healthy",
            "timestamp": time.Now().Unix(),
            "version": "1.0.0",
        })
    })

    // API routes
    api := router.Group("/api/v1")
    {
        api.GET("/status", func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{
                "message": "Kronop Server is running",
                "status": "operational",
            })
        })
    }

    // Get port from environment
    port := os.Getenv("SERVER_PORT")
    if port == "" {
        port = "8080"
    }

    // Start server
    log.Printf("🚀 Kronop Server starting on port %s", port)
    if err := router.Run(":" + port); err != nil {
        log.Fatal("Failed to start server:", err)
    }
}
EOF
        success "main.go created"
    fi
    
    # Create go.mod
    if [[ ! -f backend/go.mod ]]; then
        log "Initializing Go module..."
        cd backend
        go mod init github.com/kronop/backend
        go get github.com/gin-gonic/gin
        cd ..
        success "Go module initialized"
    fi
}

# Generate SSL certificates
generate_ssl() {
    log "Generating SSL certificates..."
    
    mkdir -p config/ssl
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout config/ssl/key.pem \
        -out config/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Kronop/CN=localhost" \
        2>/dev/null || {
        warning "OpenSSL not found, skipping SSL certificate generation"
        warning "Please install OpenSSL: sudo apt-get install openssl"
        return
    }
    
    success "SSL certificates generated"
}

# Build and run server
build_and_run() {
    log "Building and starting Kronop server..."
    
    cd ~/kronop
    
    # Build Docker image
    log "Building Docker image..."
    docker build -t kronop-server:latest ./backend
    
    # Start services
    log "Starting services with Docker Compose..."
    docker compose up -d
    
    # Wait for services to start
    log "Waiting for services to start..."
    sleep 10
    
    # Check if server is running
    if curl -s http://localhost:8080/health > /dev/null; then
        success "🎉 Kronop Server is running successfully!"
        echo ""
        echo "📊 Server Information:"
        echo "  - HTTP Server: http://localhost:8080"
        echo "  - HTTPS Server: https://localhost:8443"
        echo "  - Health Check: http://localhost:8080/health"
        echo "  - API Status: http://localhost:8080/api/v1/status"
        echo ""
        echo "📋 Management Commands:"
        echo "  - View logs: docker compose logs -f kronop-server"
        echo "  - Stop server: docker compose down"
        echo "  - Restart: docker compose restart"
        echo "  - Check status: docker compose ps"
        echo ""
        echo "🔧 Configuration:"
        echo "  - Edit .env file to change settings"
        echo "  - Add videos to ./data/input directory"
        echo "  - Logs are stored in ./logs directory"
    else
        error "Server failed to start. Check logs: docker compose logs kronop-server"
        exit 1
    fi
}

# Main function
main() {
    echo "🚀 Kronop Server - Professional Setup Script"
    echo "=========================================="
    echo ""
    
    check_root
    detect_os
    check_requirements
    
    echo ""
    read -p "Do you want to install Go? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_go
    fi
    
    echo ""
    read -p "Do you want to install Docker? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_docker
    fi
    
    echo ""
    read -p "Do you want to setup the Kronop project? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_project
        generate_ssl
        build_and_run
    fi
    
    echo ""
    success "Setup completed! 🎉"
    echo ""
    echo "Next steps:"
    echo "1. Add your video files to ~/kronop/data/input"
    echo "2. Access the server at http://localhost:8080"
    echo "3. Check the API at http://localhost:8080/api/v1/status"
    echo "4. View logs with: docker compose logs -f kronop-server"
}

# Run main function
main "$@"

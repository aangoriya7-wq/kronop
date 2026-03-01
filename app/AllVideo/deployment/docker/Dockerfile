# Kronop Video Platform - Multi-Stage Docker Build
# Optimized for 500M+ users with global scaling
# Stage 1: Builder
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata gcc musl-dev

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Stage 2: Runtime
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata

# Create app user
RUN addgroup -g 1001 -S kronop && \
    adduser -u 1001 -S kronop -G kronop

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main /app/main

# Copy configuration files
COPY --from=builder /app/configs /app/configs
COPY --from=builder /app/migrations /app/migrations

# Create necessary directories
RUN mkdir -p /app/logs /app/data /app/cache && \
    chown -R kronop:kronop /app

# Switch to app user
USER kronop

# Expose ports
EXPOSE 8080 9090 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application
CMD ["./main"]

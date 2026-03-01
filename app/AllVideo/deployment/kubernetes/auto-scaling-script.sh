#!/bin/bash
# Kronop Auto-Scaling Script - Self-Healing Architecture
# Automatically scales services based on traffic and performance metrics
# Designed for 500M+ users with intelligent scaling decisions

set -euo pipefail

# Configuration
NAMESPACE="kronop-production"
SCALE_UP_THRESHOLD=80
SCALE_DOWN_THRESHOLD=30
MIN_REPLICAS=10
MAX_REPLICAS=100
CHECK_INTERVAL=30
LOG_FILE="/var/log/kronop-auto-scaling.log"

# Services to monitor
SERVICES=("api-gateway" "video-processor" "ai-enhancement" "analytics")

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Get current metrics for a service
get_service_metrics() {
    local service=$1
    local namespace=$2
    
    # Get CPU and memory usage
    local cpu_usage=$(kubectl top pods -n "$namespace" -l app="$service" --no-headers | awk '{sum+=$2} END {print sum}')
    local memory_usage=$(kubectl top pods -n "$namespace" -l app="$service" --no-headers | awk '{sum+=$3} END {print sum}')
    
    # Get request rate from metrics
    local request_rate=$(kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/$namespace/pods/*/http_requests_per_second" | jq '.items[] | select(.metadata.labels.app == "'$service'") | .value' | awk '{sum+=$1} END {print sum}')
    
    # Get response time
    local response_time=$(kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/$namespace/pods/*/http_response_time_ms" | jq '.items[] | select(.metadata.labels.app == "'$service'") | .value' | awk '{sum+=$1} END {print sum/NR}')
    
    echo "$cpu_usage,$memory_usage,$request_rate,$response_time"
}

# Get current replica count
get_replica_count() {
    local service=$1
    local namespace=$2
    
    kubectl get deployment "$service" -n "$namespace" -o jsonpath='{.spec.replicas}'
}

# Scale service
scale_service() {
    local service=$1
    local namespace=$2
    local replicas=$3
    
    log "Scaling $service to $replicas replicas"
    kubectl scale deployment "$service" --replicas="$replicas" -n "$namespace"
    
    # Wait for scaling to complete
    kubectl rollout status deployment/"$service" -n "$namespace" --timeout=300s
}

# Check if service needs scaling
check_scaling_needs() {
    local service=$1
    local namespace=$2
    
    log "Checking scaling needs for $service"
    
    # Get current metrics
    local metrics=$(get_service_metrics "$service" "$namespace")
    IFS=',' read -r cpu_usage memory_usage request_rate response_time <<< "$metrics"
    
    # Get current replica count
    local current_replicas=$(get_replica_count "$service" "$namespace")
    
    log "Current metrics for $service: CPU=$cpu_usage, Memory=$memory_usage, Requests=$request_rate, ResponseTime=$response_time, Replicas=$current_replicas"
    
    # Scaling logic
    local should_scale=false
    local target_replicas=$current_replicas
    
    # Scale up conditions
    if [[ $cpu_usage -gt $SCALE_UP_THRESHOLD ]]; then
        should_scale=true
        target_replicas=$((current_replicas * 2))
        log "CPU usage ($cpu_usage%) exceeds threshold ($SCALE_UP_THRESHOLD%), scaling up"
    elif [[ $memory_usage -gt $SCALE_UP_THRESHOLD ]]; then
        should_scale=true
        target_replicas=$((current_replicas * 2))
        log "Memory usage ($memory_usage%) exceeds threshold ($SCALE_UP_THRESHOLD%), scaling up"
    elif [[ $request_rate -gt 1000 ]]; then
        should_scale=true
        target_replicas=$((current_replicas + (request_rate / 1000)))
        log "Request rate ($request_rate req/s) exceeds threshold, scaling up"
    elif [[ $response_time -gt 500 ]]; then
        should_scale=true
        target_replicas=$((current_replicas * 2))
        log "Response time ($response_time ms) exceeds threshold, scaling up"
    fi
    
    # Scale down conditions
    if [[ $cpu_usage -lt $SCALE_DOWN_THRESHOLD && $memory_usage -lt $SCALE_DOWN_THRESHOLD && $request_rate -lt 500 && $response_time -lt 200 ]]; then
        if [[ $current_replicas -gt $MIN_REPLICAS ]]; then
            should_scale=true
            target_replicas=$((current_replicas / 2))
            log "All metrics below threshold, scaling down"
        fi
    fi
    
    # Apply limits
    if [[ $target_replicas -lt $MIN_REPLICAS ]]; then
        target_replicas=$MIN_REPLICAS
    elif [[ $target_replicas -gt $MAX_REPLICAS ]]; then
        target_replicas=$MAX_REPLICAS
    fi
    
    # Execute scaling
    if [[ $should_scale && $target_replicas -ne $current_replicas ]]; then
        scale_service "$service" "$namespace" "$target_replicas"
        log "Scaled $service from $current_replicas to $target_replicas replicas"
    else
        log "No scaling needed for $service"
    fi
}

# Health check for services
health_check() {
    local service=$1
    local namespace=$2
    
    log "Performing health check for $service"
    
    # Check if deployment is ready
    local ready_replicas=$(kubectl get deployment "$service" -n "$namespace" -o jsonpath='{.status.readyReplicas}')
    local total_replicas=$(kubectl get deployment "$service" -n "$namespace" -o jsonpath='{.spec.replicas}')
    
    if [[ $ready_replicas -eq $total_replicas ]]; then
        log "$service is healthy ($ready_replicas/$total_replicas ready)"
        return 0
    else
        log "$service is unhealthy ($ready_replicas/$total_replicas ready)"
        return 1
    fi
}

# Self-healing function
self_heal() {
    local service=$1
    local namespace=$2
    
    log "Self-healing check for $service"
    
    # Check if service is healthy
    if ! health_check "$service" "$namespace"; then
        log "Service $service is unhealthy, attempting self-healing"
        
        # Get current replica count
        local current_replicas=$(get_replica_count "$service" "$namespace")
        
        # Restart deployment
        log "Restarting $service deployment"
        kubectl rollout restart deployment/"$service" -n "$namespace"
        
        # Wait for rollout to complete
        kubectl rollout status deployment/"$service" -n "$namespace" --timeout=300s
        
        # Check if healing was successful
        if health_check "$service" "$namespace"; then
            log "Self-healing successful for $service"
        else
            log "Self-healing failed for $service, escalating"
            # Could add alerting here
        fi
    fi
}

# Predictive scaling based on traffic patterns
predictive_scaling() {
    local service=$1
    local namespace=$2
    
    log "Performing predictive scaling for $service"
    
    # Get historical metrics (simplified - in reality would use time series database)
    local current_hour=$(date +%H)
    local current_day=$(date +%u)
    
    # Traffic patterns (example: higher traffic during business hours)
    local business_hours_start=9
    local business_hours_end=18
    local weekend_factor=0.7
    
    local scale_factor=1.0
    
    # Adjust for time of day
    if [[ $current_day -le 5 && $current_hour -ge $business_hours_start && $current_hour -le $business_hours_end ]]; then
        scale_factor=1.5
    elif [[ $current_day -gt 5 ]]; then
        scale_factor=$weekend_factor
    fi
    
    # Get current replica count
    local current_replicas=$(get_replica_count "$service" "$namespace")
    local predicted_replicas=$(echo "$current_replicas * $scale_factor" | bc)
    
    # Round to nearest integer
    predicted_replicas=$(echo "($predicted_replicas + 0.5)/1" | bc)
    
    # Apply limits
    if [[ $predicted_replicas -lt $MIN_REPLICAS ]]; then
        predicted_replicas=$MIN_REPLICAS
    elif [[ $predicted_replicas -gt $MAX_REPLICAS ]]; then
        predicted_replicas=$MAX_REPLICAS
    fi
    
    # Apply predictive scaling if different from current
    if [[ $predicted_replicas -ne $current_replicas ]]; then
        log "Predictive scaling: adjusting $service from $current_replicas to $predicted_replicas replicas"
        scale_service "$service" "$namespace" "$predicted_replicas"
    fi
}

# Load balancing check
load_balancing_check() {
    local service=$1
    local namespace=$2
    
    log "Checking load balancing for $service"
    
    # Get pod resource usage
    local pod_usage=$(kubectl top pods -n "$namespace" -l app="$service" --no-headers)
    
    # Check for uneven distribution
    local max_cpu=0
    local min_cpu=100
    local max_memory=0
    local min_memory=100
    
    while IFS= read -r line; do
        local cpu=$(echo "$line" | awk '{print $2}' | sed 's/m//')
        local memory=$(echo "$line" | awk '{print $3}' | sed 's/Mi//')
        
        # Remove 'm' and 'Mi' suffixes and convert to numbers
        cpu=${cpu%m}
        memory=${memory%Mi}
        
        if [[ $cpu -gt $max_cpu ]]; then
            max_cpu=$cpu
        fi
        if [[ $cpu -lt $min_cpu ]]; then
            min_cpu=$cpu
        fi
        if [[ $memory -gt $max_memory ]]; then
            max_memory=$memory
        fi
        if [[ $memory -lt $min_memory ]]; then
            min_memory=$memory
        fi
    done <<< "$pod_usage"
    
    # Calculate variance
    local cpu_variance=$((max_cpu - min_cpu))
    local memory_variance=$((max_memory - min_memory))
    
    log "Load balancing metrics for $service: CPU variance=$cpu_variance, Memory variance=$memory_variance"
    
    # If variance is high, restart pods to redistribute load
    if [[ $cpu_variance -gt 50 || $memory_variance -gt 100 ]]; then
        log "High variance detected, redistributing load for $service"
        kubectl rollout restart deployment/"$service" -n "$namespace"
    fi
}

# Main monitoring loop
main_loop() {
    log "Starting auto-scaling main loop"
    
    while true; do
        for service in "${SERVICES[@]}"; do
            # Check if service exists
            if kubectl get deployment "$service" -n "$NAMESPACE" &>/dev/null; then
                # Perform health check
                self_heal "$service" "$NAMESPACE"
                
                # Check scaling needs
                check_scaling_needs "$service" "$NAMESPACE"
                
                # Predictive scaling
                predictive_scaling "$service" "$NAMESPACE"
                
                # Load balancing check
                load_balancing_check "$service" "$NAMESPACE"
            else
                log "Service $service not found in namespace $NAMESPACE"
            fi
        done
        
        # Wait for next check
        sleep "$CHECK_INTERVAL"
    done
}

# Signal handlers
cleanup() {
    log "Auto-scaling script stopping"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start the auto-scaling script
log "Kronop Auto-Scaling Script Started"
log "Namespace: $NAMESPACE"
log "Services: ${SERVICES[*]}"
log "Scale Up Threshold: $SCALE_UP_THRESHOLD%"
log "Scale Down Threshold: $SCALE_DOWN_THRESHOLD%"
log "Min Replicas: $MIN_REPLICAS"
log "Max Replicas: $MAX_REPLICAS"
log "Check Interval: ${CHECK_INTERVAL}s"

# Run main loop
main_loop

-- Load Shedding Schema - 500M User Load Handler
-- 
-- Optimized for massive concurrent video playback requests
-- Supports load shedding, edge caching, and performance monitoring
-- Designed for 500M+ users with zero downtime

-- ========================================
-- LOAD SHEDDING TABLES
-- ========================================

-- Load Shedding Metrics Table
CREATE TABLE IF NOT EXISTS kronop.load_shedding_metrics (
    metric_id          uuid PRIMARY KEY,
    timestamp           timestamp,
    current_requests    bigint,
    total_requests      bigint,
    rejected_requests   bigint,
    shedded_requests    bigint,
    cached_requests     bigint,
    average_response_time bigint,
    p95_response_time   bigint,
    p99_response_time   bigint,
    memory_usage        float,
    cpu_usage           float,
    network_bandwidth   bigint,
    error_rate          float,
    timeout_rate        float,
    circuit_breaker_trips bigint,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300
AND default_time_to_live = 86400; -- 24 hours TTL

-- Circuit Breaker States Table
CREATE TABLE IF NOT EXISTS kronop.circuit_breaker_states (
    service_id          uuid PRIMARY KEY,
    service_name        text,
    state               int,           -- 0=Closed, 1=Open, 2=HalfOpen
    failure_count       bigint,
    last_failure_time   timestamp,
    timeout_duration    bigint,
    threshold           int,
    recovery_timeout    bigint,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Rate Limiting Table
CREATE TABLE IF NOT EXISTS kronop.rate_limits (
    user_id             uuid PRIMARY KEY,
    requests_per_second int,
    burst_size          int,
    tokens              bigint,
    last_refill         timestamp,
    window_start        timestamp,
    request_count       bigint,
    blocked_requests    bigint,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Request Queue Table
CREATE TABLE IF NOT EXISTS kronop.request_queue (
    request_id          uuid PRIMARY KEY,
    user_id             uuid,
    video_id            uuid,
    priority            int,
    status              text,           -- "queued", "processing", "completed", "failed"
    queue_time          timestamp,
    start_time          timestamp,
    end_time            timestamp,
    processing_time     bigint,
    node_id             text,
    metadata            text,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300
AND default_time_to_live = 3600; -- 1 hour TTL

-- ========================================
-- EDGE CACHE TABLES
-- ========================================

-- Edge Cache Nodes Table
CREATE TABLE IF NOT EXISTS kronop.edge_cache_nodes (
    node_id             text PRIMARY KEY,
    region              text,
    country             text,
    city                text,
    latitude            float,
    longitude           float,
    capacity            bigint,
    used_capacity       bigint,
    hit_ratio           float,
    is_active           boolean,
    health_score        float,
    last_health_check   timestamp,
    last_cleanup        timestamp,
    ip_address          text,
    port                int,
    bandwidth           bigint,
    latency             bigint,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Edge Cache Entries Table
CREATE TABLE IF NOT EXISTS kronop.edge_cache_entries (
    node_id             text,
    content_id          uuid,
    content_type        text,
    content_size        bigint,
    access_count        bigint,
    last_accessed       timestamp,
    expires_at          timestamp,
    created_at          timestamp,
    PRIMARY KEY ((node_id), content_id)
) WITH CLUSTERING ORDER BY (content_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 3600
AND default_time_to_live = 2592000; -- 30 days TTL

-- Cache Hit Analytics Table
CREATE TABLE IF NOT EXISTS kronop.cache_hit_analytics (
    node_id             text,
    timestamp           timestamp,
    content_id          uuid,
    hit_type            text,           -- "edge", "cdn", "miss"
    user_location       text,
    device_type         text,
    response_time       bigint,
    PRIMARY KEY ((node_id), timestamp DESC, content_id)
) WITH CLUSTERING ORDER BY (timestamp DESC, content_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300
AND default_time_to_live = 86400; -- 24 hours TTL

-- CDN Integration Table
CREATE TABLE IF NOT EXISTS kronop.cdn_integration (
    content_id          uuid PRIMARY KEY,
    cdn_url             text,
    provider            text,
    cache_control       text,
    ttl                 bigint,
    invalidation_status text,
    last_invalidated    timestamp,
    access_count        bigint,
    bandwidth_saved     bigint,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- ========================================
-- VIDEO HANDLER TABLES
-- ========================================

-- Video Request Analytics Table
CREATE TABLE IF NOT EXISTS kronop.video_request_analytics (
    request_id          uuid PRIMARY KEY,
    user_id             uuid,
    video_id            uuid,
    quality             text,
    bitrate             int,
    format              text,
    device_type         text,
    user_agent          text,
    ip_address          text,
    location_country    text,
    location_region     text,
    location_city       text,
    priority            int,
    status              text,           -- "success", "failed", "shedded", "rate_limited"
    response_time       bigint,
    cached              boolean,
    cache_node          text,
    cdn_url             text,
    error_reason        text,
    timestamp           timestamp,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300
AND default_time_to_live = 86400; -- 24 hours TTL

-- Video Performance Metrics Table
CREATE TABLE IF NOT EXISTS kronop.video_performance_metrics (
    metric_id           uuid PRIMARY KEY,
    timestamp           timestamp,
    total_requests      bigint,
    successful_requests bigint,
    failed_requests     bigint,
    shedded_requests    bigint,
    average_response_time bigint,
    p95_response_time   bigint,
    p99_response_time   bigint,
    videos_served       bigint,
    total_bandwidth     bigint,
    average_bitrate     int,
    quality_distribution map<text, bigint>,
    device_distribution  map<text, bigint>,
    geographic_distribution map<text, bigint>,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300
AND default_time_to_live = 86400; -- 24 hours TTL

-- Video Quality Analytics Table
CREATE TABLE IF NOT EXISTS kronop.video_quality_analytics (
    video_id            uuid,
    quality             text,
    bitrate             int,
    device_type         text,
    location_region     text,
    request_count       bigint,
    success_count       bigint,
    error_count         bigint,
    average_response_time bigint,
    timestamp           timestamp,
    PRIMARY KEY ((video_id), quality, device_type, location_region, timestamp DESC)
) WITH CLUSTERING ORDER BY (timestamp DESC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 3600
AND default_time_to_live = 2592000; -- 30 days TTL

-- ========================================
-- HEALTH MONITORING TABLES
-- ========================================

-- System Health Table
CREATE TABLE IF NOT EXISTS kronop.system_health (
    component           text PRIMARY KEY,
    status              text,           -- "healthy", "degraded", "unhealthy"
    health_score        float,
    cpu_usage           float,
    memory_usage        float,
    disk_usage          float,
    network_usage       float,
    error_rate          float,
    response_time       bigint,
    last_check          timestamp,
    uptime              bigint,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Health Check History Table
CREATE TABLE IF NOT EXISTS kronop.health_check_history (
    check_id            uuid PRIMARY KEY,
    component           text,
    status              text,
    health_score        float,
    metrics             text,           -- JSON string
    timestamp           timestamp,
    created_at          timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300
AND default_time_to_live = 86400; -- 24 hours TTL

-- ========================================
-- AUTO SCALING TABLES
-- ========================================

-- Auto Scaling Events Table
CREATE TABLE IF NOT EXISTS kronop.auto_scaling_events (
    event_id            uuid PRIMARY KEY,
    scaling_type        text,           -- "scale_up", "scale_down"
    trigger_reason      text,
    current_instances   int,
    target_instances    int,
    metrics             text,           -- JSON string
    status              text,           -- "triggered", "in_progress", "completed", "failed"
    started_at          timestamp,
    completed_at        timestamp,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Scaling Metrics Table
CREATE TABLE IF NOT EXISTS kronop.scaling_metrics (
    metric_id           uuid PRIMARY KEY,
    timestamp           timestamp,
    current_load        float,
    target_load         float,
    scaling_threshold   float,
    auto_scaling_enabled boolean,
    instances_count     int,
    pending_requests    bigint,
    average_response_time bigint,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300
AND default_time_to_live = 86400; -- 24 hours TTL

-- ========================================
-- USER PRIORITY TABLES
-- ========================================

-- User Priority Table
CREATE TABLE IF NOT EXISTS kronop.user_priority (
    user_id             uuid PRIMARY KEY,
    priority_level      int,
    subscription_type   text,
    is_premium          boolean,
    region              text,
    device_type         text,
    request_count       bigint,
    last_request        timestamp,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Priority Analytics Table
CREATE TABLE IF NOT EXISTS kronop.priority_analytics (
    priority_level      int,
    timestamp           timestamp,
    request_count       bigint,
    success_count       bigint,
    shedded_count       bigint,
    average_response_time bigint,
    PRIMARY KEY ((priority_level), timestamp DESC)
) WITH CLUSTERING ORDER BY (timestamp DESC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300
AND default_time_to_live = 86400; -- 24 hours TTL

-- ========================================
-- GEOGRAPHIC ROUTING TABLES
-- ========================================

-- Geographic Regions Table
CREATE TABLE IF NOT EXISTS kronop.geographic_regions (
    region_id          uuid PRIMARY KEY,
    region_name        text,
    country            text,
    cities             list<text>,
    center_latitude    float,
    center_longitude   float,
    nodes              list<text>,
    preferred_nodes    list<text>,
    max_distance       int,            -- kilometers
    population         bigint,
    created_at          timestamp,
    updated_at          timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Distance Matrix Table
CREATE TABLE IF NOT EXISTS kronop.distance_matrix (
    from_region         text,
    to_region           text,
    distance            float,          -- kilometers
    latency             bigint,         -- milliseconds
    bandwidth           bigint,         -- bps
    PRIMARY KEY ((from_region), to_region)
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Regional Analytics Table
CREATE TABLE IF NOT EXISTS kronop.regional_analytics (
    region              text,
    timestamp           timestamp,
    request_count       bigint,
    success_count       bigint,
    cache_hit_ratio     float,
    average_response_time bigint,
    bandwidth_used      bigint,
    active_users        bigint,
    PRIMARY KEY ((region), timestamp DESC)
) WITH CLUSTERING ORDER BY (timestamp DESC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300
AND default_time_to_live = 86400; -- 24 hours TTL

-- ========================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- ========================================

-- Load shedding indexes
CREATE INDEX IF NOT EXISTS ON kronop.load_shedding_metrics (timestamp);
CREATE INDEX IF NOT EXISTS ON kronop.circuit_breaker_states (service_name);
CREATE INDEX IF NOT EXISTS ON kronop.circuit_breaker_states (state);
CREATE INDEX IF NOT EXISTS ON kronop.rate_limits (user_id);
CREATE INDEX IF NOT EXISTS ON kronop.rate_limits (last_refill);
CREATE INDEX IF NOT EXISTS ON kronop.request_queue (user_id);
CREATE INDEX IF NOT EXISTS ON kronop.request_queue (video_id);
CREATE INDEX IF NOT EXISTS ON kronop.request_queue (priority);
CREATE INDEX IF NOT EXISTS ON kronop.request_queue (status);
CREATE INDEX IF NOT EXISTS ON kronop.request_queue (queue_time);

-- Edge cache indexes
CREATE INDEX IF NOT EXISTS ON kronop.edge_cache_nodes (region);
CREATE INDEX IF NOT EXISTS ON kronop.edge_cache_nodes (country);
CREATE INDEX IF NOT EXISTS ON kronop.edge_cache_nodes (is_active);
CREATE INDEX IF NOT EXISTS ON kronop.edge_cache_nodes (health_score);
CREATE INDEX IF NOT EXISTS ON kronop.edge_cache_entries (content_id);
CREATE INDEX IF NOT EXISTS ON kronop.edge_cache_entries (expires_at);
CREATE INDEX IF NOT EXISTS ON kronop.cache_hit_analytics (timestamp);
CREATE INDEX IF NOT EXISTS ON kronop.cache_hit_analytics (hit_type);
CREATE INDEX IF NOT EXISTS ON kronop.cache_hit_analytics (user_location);
CREATE INDEX IF NOT EXISTS ON kronop.cdn_integration (provider);
CREATE INDEX IF NOT EXISTS ON kronop.cdn_integration (invalidation_status);

-- Video handler indexes
CREATE INDEX IF NOT EXISTS ON kronop.video_request_analytics (user_id);
CREATE INDEX IF NOT EXISTS ON kronop.video_request_analytics (video_id);
CREATE INDEX IF NOT EXISTS ON kronop.video_request_analytics (quality);
CREATE INDEX IF NOT EXISTS ON kronop.video_request_analytics (device_type);
CREATE INDEX IF NOT EXISTS ON kronop.video_request_analytics (location_region);
CREATE INDEX IF NOT EXISTS ON kronop.video_request_analytics (priority);
CREATE INDEX IF NOT EXISTS ON kronop.video_request_analytics (status);
CREATE INDEX IF NOT EXISTS ON kronop.video_request_analytics (timestamp);
CREATE INDEX IF NOT EXISTS ON kronop.video_performance_metrics (timestamp);
CREATE INDEX IF NOT EXISTS ON kronop.video_quality_analytics (video_id);
CREATE INDEX IF NOT EXISTS ON kronop.video_quality_analytics (quality);
CREATE INDEX IF NOT EXISTS ON kronop.video_quality_analytics (device_type);
CREATE INDEX IF NOT EXISTS ON kronop.video_quality_analytics (location_region);
CREATE INDEX IF NOT EXISTS ON kronop.video_quality_analytics (timestamp);

-- Health monitoring indexes
CREATE INDEX IF NOT EXISTS ON kronop.system_health (status);
CREATE INDEX IF NOT EXISTS ON kronop.system_health (health_score);
CREATE INDEX IF NOT EXISTS ON kronop.system_health (last_check);
CREATE INDEX IF NOT EXISTS ON kronop.health_check_history (component);
CREATE INDEX IF NOT EXISTS ON kronop.health_check_history (timestamp);
CREATE INDEX IF NOT EXISTS ON kronop.health_check_history (status);

-- Auto scaling indexes
CREATE INDEX IF NOT EXISTS ON kronop.auto_scaling_events (scaling_type);
CREATE INDEX IF NOT EXISTS ON kronop.auto_scaling_events (status);
CREATE INDEX IF NOT EXISTS ON kronop.auto_scaling_events (started_at);
CREATE INDEX IF NOT EXISTS ON kronop.scaling_metrics (timestamp);
CREATE INDEX IF NOT EXISTS ON kronop.scaling_metrics (auto_scaling_enabled);

-- User priority indexes
CREATE INDEX IF NOT EXISTS ON kronop.user_priority (priority_level);
CREATE INDEX IF NOT EXISTS ON kronop.user_priority (subscription_type);
CREATE INDEX IF NOT EXISTS ON kronop.user_priority (is_premium);
CREATE INDEX IF NOT EXISTS ON kronop.user_priority (region);
CREATE INDEX IF NOT EXISTS ON kronop.priority_analytics (timestamp);

-- Geographic routing indexes
CREATE INDEX IF NOT EXISTS ON kronop.geographic_regions (country);
CREATE INDEX IF NOT EXISTS ON kronop.geographic_regions (region_name);
CREATE INDEX IF NOT EXISTS ON kronop.distance_matrix (to_region);
CREATE INDEX IF NOT EXISTS ON kronop.distance_matrix (distance);
CREATE INDEX IF NOT EXISTS ON kronop.regional_analytics (timestamp);

-- ========================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ========================================

-- Real-time Load Metrics View
CREATE MATERIALIZED VIEW IF NOT EXISTS kronop.realtime_load_metrics AS
    SELECT metric_id, timestamp, current_requests, total_requests, rejected_requests, shedded_requests, cached_requests, average_response_time, memory_usage, cpu_usage
    FROM kronop.load_shedding_metrics
    WHERE timestamp > toTimestamp(now()) - 3600
    PRIMARY KEY (metric_id, timestamp);

-- Cache Performance View
CREATE MATERIALIZED VIEW IF NOT EXISTS kronop.cache_performance_view AS
    SELECT node_id, hit_ratio, used_capacity, health_score, is_active
    FROM kronop.edge_cache_nodes
    WHERE is_active = true
    PRIMARY KEY (node_id);

-- Regional Performance View
CREATE MATERIALIZED VIEW IF NOT EXISTS kronop.regional_performance_view AS
    SELECT region, request_count, success_count, cache_hit_ratio, average_response_time, bandwidth_used
    FROM kronop.regional_analytics
    WHERE timestamp > toTimestamp(now()) - 3600
    PRIMARY KEY (region, timestamp);

-- User Priority Performance View
CREATE MATERIALIZED VIEW IF NOT EXISTS kronop.priority_performance_view AS
    SELECT priority_level, request_count, success_count, shedded_count, average_response_time
    FROM kronop.priority_analytics
    WHERE timestamp > toTimestamp(now()) - 3600
    PRIMARY KEY (priority_level, timestamp);

-- ========================================
-- TRIGGERS AND PROCEDURES
-- ========================================

-- Load shedding trigger (would be implemented in application layer)
-- This is a placeholder for the trigger logic that would be implemented in the application

-- Cache cleanup trigger (would be implemented in application layer)
-- This is a placeholder for the trigger logic that would be implemented in the application

-- Metrics aggregation trigger (would be implemented in application layer)
-- This is a placeholder for the trigger logic that would be implemented in the application

-- ========================================
-- SAMPLE DATA INSERTION
-- ========================================

-- Insert sample edge cache nodes
INSERT INTO kronop.edge_cache_nodes (node_id, region, country, city, latitude, longitude, capacity, used_capacity, hit_ratio, is_active, health_score, last_health_check, last_cleanup, ip_address, port, bandwidth, latency, created_at, updated_at)
VALUES (
    'edge-node-us-east-1', 'us-east', 'United States', 'New York', 40.7128, -74.0060, 1000000, 0, 0.0, true, 1.0, toTimestamp(now()), toTimestamp(now()), '192.168.1.1', 8080, 1000000000, 0, toTimestamp(now()), toTimestamp(now())
);

INSERT INTO kronop.edge_cache_nodes (node_id, region, country, city, latitude, longitude, capacity, used_capacity, hit_ratio, is_active, health_score, last_health_check, last_cleanup, ip_address, port, bandwidth, latency, created_at, updated_at)
VALUES (
    'edge-node-eu-west-1', 'eu-west', 'United Kingdom', 'London', 51.5074, -0.1278, 1000000, 0, 0.0, true, 1.0, toTimestamp(now()), toTimestamp(now()), '192.168.2.1', 8080, 1000000000, 0, toTimestamp(now()), toTimestamp(now())
);

-- Insert sample user priority
INSERT INTO kronop.user_priority (user_id, priority_level, subscription_type, is_premium, region, device_type, request_count, last_request, created_at, updated_at)
VALUES (
    uuid(), 1, 'premium', true, 'us-east', 'mobile', 0, toTimestamp(now()), toTimestamp(now()), toTimestamp(now())
);

-- Insert sample geographic region
INSERT INTO kronop.geographic_regions (region_id, region_name, country, cities, center_latitude, center_longitude, nodes, preferred_nodes, max_distance, population, created_at, updated_at)
VALUES (
    uuid(), 'us-east', 'United States', ['New York', 'Boston', 'Philadelphia'], 40.7128, -74.0060, ['edge-node-us-east-1'], ['edge-node-us-east-1'], 1000, 20000000, toTimestamp(now()), toTimestamp(now())
);

-- ========================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- ========================================

-- Set compaction thresholds for high-write tables
ALTER TABLE kronop.load_shedding_metrics WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h', 'min_threshold': '4', 'max_threshold': '32'};

ALTER TABLE kronop.video_request_analytics WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h', 'min_threshold': '4', 'max_threshold': '32'};

ALTER TABLE kronop.cache_hit_analytics WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h', 'min_threshold': '4', 'max_threshold': '32'};

-- Set read repair chance for consistency
ALTER TABLE kronop.edge_cache_nodes WITH read_repair_chance = 0.1;
ALTER TABLE kronop.system_health WITH read_repair_chance = 0.1;

-- Set speculative retry for performance
ALTER TABLE kronop.load_shedding_metrics WITH speculative_retry = 'ALWAYS';
ALTER TABLE kronop.video_request_analytics WITH speculative_retry = 'ALWAYS';

-- ========================================
-- MONITORING AND MAINTENANCE
-- ========================================

-- Create monitoring table for load shedding performance
CREATE TABLE IF NOT EXISTS kronop.load_shedding_monitoring (
    monitoring_id       uuid PRIMARY KEY,
    table_name          text,
    operation_type      text,
    execution_time      bigint,
    rows_affected       int,
    error_message       text,
    timestamp           timestamp,
    created_at          timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 3600
AND default_time_to_live = 86400; -- 24 hours TTL

-- Create maintenance log table
CREATE TABLE IF NOT EXISTS kronop.load_shedding_maintenance_log (
    log_id              uuid PRIMARY KEY,
    operation           text,
    status              text,
    start_time          timestamp,
    end_time            timestamp,
    rows_processed      int,
    error_message       text,
    metadata            text,
    created_at          timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- ========================================
-- BACKUP AND RESTORE PROCEDURES
-- ========================================

-- Note: Backup and restore procedures would be implemented using ScyllaDB's native tools
-- These are placeholders for documentation purposes

-- Backup procedure documentation:
-- 1. Use scylla backup utility for regular backups
-- 2. Store backups in multiple regions for disaster recovery
-- 3. Test restore procedures regularly
-- 4. Monitor backup success/failure rates

-- Restore procedure documentation:
-- 1. Use scylla restore utility for disaster recovery
-- 2. Verify data integrity after restore
-- 3. Update application cache after restore
-- 4. Monitor system performance after restore

-- ========================================
-- SCHEMA VERSIONING
-- ========================================

-- Schema version tracking
INSERT INTO kronop.system_config (config_key, config_value, config_type, description, is_active, created_at, updated_at)
VALUES (
    'load_shedding_schema_version', '1.0.0', 'string', 'Load shedding schema version', true, toTimestamp(now()), toTimestamp(now())
);

-- Schema migration tracking
CREATE TABLE IF NOT EXISTS kronop.load_shedding_schema_migrations (
    migration_id        uuid PRIMARY KEY,
    version             text,
    description         text,
    status              text,           -- "pending", "running", "completed", "failed"
    start_time          timestamp,
    end_time            timestamp,
    error_message       text,
    created_at          timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

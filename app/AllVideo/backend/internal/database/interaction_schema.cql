-- Infinite Interaction Schema - Real-Time Comments & Likes
-- Optimized for billions of simultaneous interactions
-- Uses ScyllaDB for massive scale and performance

-- ========================================
-- LIKES TABLES
-- ========================================

-- Likes Table (High-write optimized)
CREATE TABLE IF NOT EXISTS kronop.likes (
    like_id          uuid PRIMARY KEY,
    video_id         uuid,
    user_id          uuid,
    type             text,           -- "like", "dislike"
    timestamp        timestamp,
    ip_address       inet,
    user_agent       text,
    device_type      text,
    platform         text,
    is_deleted       boolean,
    deleted_at       timestamp,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 3600
AND default_time_to_live = 2592000; -- 30 days TTL

-- Likes by User Table (For user's like history)
CREATE TABLE IF NOT EXISTS kronop.likes_by_user (
    user_id          uuid,
    video_id         uuid,
    like_id          uuid,
    type             text,
    timestamp        timestamp,
    is_deleted       boolean,
    PRIMARY KEY ((user_id), timestamp DESC, video_id)
) WITH CLUSTERING ORDER BY (timestamp DESC, video_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '7d'}
AND gc_grace_seconds = 86400;

-- Likes by Video Table (For video's like history)
CREATE TABLE IF NOT EXISTS kronop.likes_by_video (
    video_id         uuid,
    user_id          uuid,
    like_id          uuid,
    type             text,
    timestamp        timestamp,
    is_deleted       boolean,
    PRIMARY KEY ((video_id), timestamp DESC, user_id)
) WITH CLUSTERING ORDER BY (timestamp DESC, user_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 3600;

-- ========================================
-- COMMENTS TABLES
-- ========================================

-- Comments Table (High-write optimized)
CREATE TABLE IF NOT EXISTS kronop.comments (
    comment_id       uuid PRIMARY KEY,
    video_id         uuid,
    user_id          uuid,
    parent_comment_id uuid,
    content          text,
    mentions         list<text>,
    hashtags         list<text>,
    likes_count      bigint,
    replies_count    bigint,
    is_pinned        boolean,
    is_edited        boolean,
    is_deleted       boolean,
    report_count     int,
    moderation_status text,           -- "approved", "pending", "rejected"
    ip_address       inet,
    user_agent       text,
    device_type      text,
    platform         text,
    created_at       timestamp,
    updated_at       timestamp,
    deleted_at       timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 3600
AND default_time_to_live = 7776000; -- 90 days TTL

-- Comments by Video Table (For video's comments)
CREATE TABLE IF NOT EXISTS kronop.comments_by_video (
    video_id         uuid,
    comment_id       uuid,
    user_id          uuid,
    parent_comment_id uuid,
    content          text,
    likes_count      bigint,
    replies_count    bigint,
    is_pinned        boolean,
    is_deleted       boolean,
    created_at       timestamp,
    PRIMARY KEY ((video_id), created_at DESC, comment_id)
) WITH CLUSTERING ORDER BY (created_at DESC, comment_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 3600;

-- Comments by User Table (For user's comment history)
CREATE TABLE IF NOT EXISTS kronop.comments_by_user (
    user_id          uuid,
    comment_id       uuid,
    video_id         uuid,
    content          text,
    likes_count      bigint,
    replies_count    bigint,
    is_deleted       boolean,
    created_at       timestamp,
    PRIMARY KEY ((user_id), created_at DESC, comment_id)
) WITH CLUSTERING ORDER BY (created_at DESC, comment_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '7d'}
AND gc_grace_seconds = 86400;

-- Comment Replies Table (For comment replies)
CREATE TABLE IF NOT EXISTS kronop.comment_replies (
    parent_comment_id uuid,
    comment_id       uuid,
    video_id         uuid,
    user_id          uuid,
    content          text,
    likes_count      bigint,
    is_deleted       boolean,
    created_at       timestamp,
    PRIMARY KEY ((parent_comment_id), created_at DESC, comment_id)
) WITH CLUSTERING ORDER BY (created_at DESC, comment_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 3600;

-- ========================================
-- INTERACTION COUNTERS TABLES
-- ========================================

-- Video Interaction Counters Table (Real-time counts)
CREATE TABLE IF NOT EXISTS kronop.video_interaction_counters (
    video_id         uuid PRIMARY KEY,
    likes_count      bigint,
    dislikes_count   bigint,
    comments_count   bigint,
    shares_count     bigint,
    views_count      bigint,
    last_updated     timestamp,
    version          bigint,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- User Interaction Counters Table (User's interaction stats)
CREATE TABLE IF NOT EXISTS kronop.user_interaction_counters (
    user_id          uuid PRIMARY KEY,
    likes_given      bigint,
    dislikes_given   bigint,
    comments_made    bigint,
    shares_made      bigint,
    videos_viewed    bigint,
    last_active      timestamp,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- ========================================
-- INTERACTION ANALYTICS TABLES
-- ========================================

-- Interaction Analytics Table (For analytics)
CREATE TABLE IF NOT EXISTS kronop.interaction_analytics (
    video_id         uuid,
    user_id          uuid,
    interaction_type text,           -- "like", "dislike", "comment", "share", "view"
    timestamp        timestamp,
    device_type      text,
    platform         text,
    location         text,
    session_id       uuid,
    referrer         text,
    metadata         text,           -- JSON string
    PRIMARY KEY ((video_id), interaction_type, timestamp DESC, user_id)
) WITH CLUSTERING ORDER BY (interaction_type ASC, timestamp DESC, user_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 3600;

-- User Interaction Analytics Table (For user behavior)
CREATE TABLE IF NOT EXISTS kronop.user_interaction_analytics (
    user_id          uuid,
    interaction_type text,
    timestamp        timestamp,
    video_id         uuid,
    device_type      text,
    platform         text,
    location         text,
    session_id       uuid,
    referrer         text,
    metadata         text,
    PRIMARY KEY ((user_id), interaction_type, timestamp DESC, video_id)
) WITH CLUSTERING ORDER BY (interaction_type ASC, timestamp DESC, video_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '7d'}
AND gc_grace_seconds = 86400;

-- ========================================
-- SPAM AND ABUSE DETECTION TABLES
-- ========================================

-- Spam Detection Table (For spam detection)
CREATE TABLE IF NOT EXISTS kronop.spam_detection (
    user_id          uuid PRIMARY KEY,
    spam_score       float,
    spam_count       int,
    last_spam        timestamp,
    is_blocked       boolean,
    blocked_until    timestamp,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Abuse Reports Table (For abuse reporting)
CREATE TABLE IF NOT EXISTS kronop.abuse_reports (
    report_id        uuid PRIMARY KEY,
    reporter_id      uuid,
    target_type      text,           -- "comment", "video", "user"
    target_id        uuid,
    reason           text,
    description      text,
    status           text,           -- "pending", "reviewed", "resolved", "dismissed"
    priority         int,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- ========================================
-- REAL-TIME UPDATES TABLES
-- ========================================

-- Real-time Updates Table (For WebSocket updates)
CREATE TABLE IF NOT EXISTS kronop.realtime_updates (
    update_id        uuid PRIMARY KEY,
    video_id         uuid,
    user_id          uuid,
    update_type      text,           -- "like", "dislike", "comment", "share"
    update_data      text,           -- JSON string
    timestamp        timestamp,
    expires_at       timestamp,
    created_at       timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300
AND default_time_to_live = 3600; -- 1 hour TTL

-- User Notification Queue Table (For user notifications)
CREATE TABLE IF NOT EXISTS kronop.user_notification_queue (
    user_id          uuid,
    notification_id  uuid,
    notification_type text,
    notification_data text,
    timestamp        timestamp,
    is_delivered      boolean,
    delivered_at      timestamp,
    PRIMARY KEY ((user_id), timestamp DESC, notification_id)
) WITH CLUSTERING ORDER BY (timestamp DESC, notification_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 86400
AND default_time_to_live = 604800; -- 7 days TTL

-- ========================================
-- PERFORMANCE MONITORING TABLES
-- ========================================

-- Interaction Performance Table (For performance monitoring)
CREATE TABLE IF NOT EXISTS kronop.interaction_performance (
    metric_name      text,
    timestamp        timestamp,
    value            bigint,
    metadata         text,
    PRIMARY KEY ((metric_name), timestamp DESC)
) WITH CLUSTERING ORDER BY (timestamp DESC)
AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1h'}
AND gc_grace_seconds = 300;

-- System Health Table (For system health monitoring)
CREATE TABLE IF NOT EXISTS kronop.system_health (
    component        text PRIMARY KEY,
    status           text,
    last_check       timestamp,
    error_count      int,
    last_error       text,
    metadata         text,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- ========================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- ========================================

-- Likes indexes
CREATE INDEX IF NOT EXISTS ON kronop.likes (video_id);
CREATE INDEX IF NOT EXISTS ON kronop.likes (user_id);
CREATE INDEX IF NOT EXISTS ON kronop.likes (type);
CREATE INDEX IF NOT EXISTS ON kronop.likes (timestamp);
CREATE INDEX IF NOT EXISTS ON kronop.likes (is_deleted);

-- Comments indexes
CREATE INDEX IF NOT EXISTS ON kronop.comments (video_id);
CREATE INDEX IF NOT EXISTS ON kronop.comments (user_id);
CREATE INDEX IF NOT EXISTS ON kronop.comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS ON kronop.comments (is_pinned);
CREATE INDEX IF NOT EXISTS ON kronop.comments (is_deleted);
CREATE INDEX IF NOT EXISTS ON kronop.comments (moderation_status);
CREATE INDEX IF NOT EXISTS ON kronop.comments (created_at);

-- Interaction analytics indexes
CREATE INDEX IF NOT EXISTS ON kronop.interaction_analytics (user_id);
CREATE INDEX IF NOT EXISTS ON kronop.interaction_analytics (interaction_type);
CREATE INDEX IF NOT EXISTS ON kronop.interaction_analytics (timestamp);
CREATE INDEX IF NOT EXISTS ON kronop.interaction_analytics (device_type);
CREATE INDEX IF NOT EXISTS ON kronop.interaction_analytics (platform);

-- User interaction analytics indexes
CREATE INDEX IF NOT EXISTS ON kronop.user_interaction_analytics (interaction_type);
CREATE INDEX IF NOT EXISTS ON kronop.user_interaction_analytics (timestamp);
CREATE INDEX IF NOT EXISTS ON kronop.user_interaction_analytics (video_id);

-- Spam detection indexes
CREATE INDEX IF NOT EXISTS ON kronop.spam_detection (is_blocked);
CREATE INDEX IF NOT EXISTS ON kronop.spam_detection (spam_score);
CREATE INDEX IF NOT EXISTS ON kronop.spam_detection (last_spam);

-- Abuse reports indexes
CREATE INDEX IF NOT EXISTS ON kronop.abuse_reports (target_type);
CREATE INDEX IF NOT EXISTS ON kronop.abuse_reports (target_id);
CREATE INDEX IF NOT EXISTS ON kronop.abuse_reports (status);
CREATE INDEX IF NOT EXISTS ON kronop.abuse_reports (priority);
CREATE INDEX IF NOT EXISTS ON kronop.abuse_reports (created_at);

-- Real-time updates indexes
CREATE INDEX IF NOT EXISTS ON kronop.realtime_updates (video_id);
CREATE INDEX IF NOT EXISTS ON kronop.realtime_updates (user_id);
CREATE INDEX IF NOT EXISTS ON kronop.realtime_updates (update_type);
CREATE INDEX IF NOT EXISTS ON kronop.realtime_updates (timestamp);
CREATE INDEX IF NOT EXISTS ON kronop.realtime_updates (expires_at);

-- User notification queue indexes
CREATE INDEX IF NOT EXISTS ON kronop.user_notification_queue (notification_type);
CREATE INDEX IF NOT EXISTS ON kronop.user_notification_queue (is_delivered);
CREATE INDEX IF NOT EXISTS ON kronop.user_notification_queue (delivered_at);

-- ========================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ========================================

-- Trending Videos by Interactions View
CREATE MATERIALIZED VIEW IF NOT EXISTS kronop.trending_videos_interactions AS
    SELECT video_id, likes_count, dislikes_count, comments_count, shares_count, last_updated
    FROM kronop.video_interaction_counters
    WHERE likes_count > 100 OR comments_count > 50 OR shares_count > 25
    PRIMARY KEY (video_id);

-- Most Active Users View
CREATE MATERIALIZED VIEW IF NOT EXISTS kronop.most_active_users AS
    SELECT user_id, likes_given, dislikes_given, comments_made, shares_made, videos_viewed, last_active
    FROM kronop.user_interaction_counters
    WHERE (likes_given + dislikes_given + comments_made + shares_made) > 100
    PRIMARY KEY (user_id);

-- Recent Interactions View
CREATE MATERIALIZED VIEW IF NOT EXISTS kronop.recent_interactions AS
    SELECT video_id, user_id, interaction_type, timestamp, device_type, platform
    FROM kronop.interaction_analytics
    WHERE timestamp > toTimestamp(now()) - 3600
    PRIMARY KEY ((video_id), interaction_type, timestamp DESC, user_id);

-- ========================================
-- TRIGGERS AND PROCEDURES
-- ========================================

-- Update video interaction counter trigger (would be implemented in application layer)
-- This is a placeholder for the trigger logic that would be implemented in the application

-- Update user interaction counter trigger (would be implemented in application layer)
-- This is a placeholder for the trigger logic that would be implemented in the application

-- ========================================
-- SAMPLE DATA INSERTION
-- ========================================

-- Insert sample interaction counters
INSERT INTO kronop.video_interaction_counters (video_id, likes_count, dislikes_count, comments_count, shares_count, views_count, last_updated, version, created_at, updated_at)
VALUES (
    uuid(), 1000, 50, 200, 75, 10000, toTimestamp(now()), 1, toTimestamp(now()), toTimestamp(now())
);

INSERT INTO kronop.user_interaction_counters (user_id, likes_given, dislikes_given, comments_made, shares_made, videos_viewed, last_active, created_at, updated_at)
VALUES (
    uuid(), 500, 25, 100, 50, 1000, toTimestamp(now()), toTimestamp(now()), toTimestamp(now())
);

-- Insert sample spam detection data
INSERT INTO kronop.spam_detection (user_id, spam_score, spam_count, last_spam, is_blocked, blocked_until, created_at, updated_at)
VALUES (
    uuid(), 0.85, 5, toTimestamp(now()), false, toTimestamp(now() + 86400), toTimestamp(now()), toTimestamp(now())
);

-- Insert sample abuse report
INSERT INTO kronop.abuse_reports (report_id, reporter_id, target_type, target_id, reason, description, status, priority, created_at, updated_at)
VALUES (
    uuid(), uuid(), 'comment', uuid(), 'spam', 'This comment appears to be spam', 'pending', 1, toTimestamp(now()), toTimestamp(now())
);

-- ========================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- ========================================

-- Set compaction thresholds for high-write tables
ALTER TABLE kronop.likes WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d', 'min_threshold': '4', 'max_threshold': '32'};

ALTER TABLE kronop.comments WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d', 'min_threshold': '4', 'max_threshold': '32'};

ALTER TABLE kronop.interaction_analytics WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d', 'min_threshold': '4', 'max_threshold': '32'};

-- Set read repair chance for consistency
ALTER TABLE kronop.video_interaction_counters WITH read_repair_chance = 0.1;
ALTER TABLE kronop.user_interaction_counters WITH read_repair_chance = 0.1;

-- Set speculative retry for performance
ALTER TABLE kronop.likes WITH speculative_retry = 'ALWAYS';
ALTER TABLE kronop.comments WITH speculative_retry = 'ALWAYS';

-- ========================================
-- MONITORING AND MAINTENANCE
-- ========================================

-- Create monitoring table for interaction performance
CREATE TABLE IF NOT EXISTS kronop.interaction_monitoring (
    monitoring_id    uuid PRIMARY KEY,
    table_name       text,
    operation_type   text,
    execution_time   bigint,
    rows_affected    int,
    error_message    text,
    timestamp        timestamp,
    created_at       timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': '1d'}
AND gc_grace_seconds = 3600
AND default_time_to_live = 86400; -- 24 hours TTL

-- Create maintenance log table
CREATE TABLE IF NOT EXISTS kronop.maintenance_log (
    log_id           uuid PRIMARY KEY,
    operation        text,
    status           text,
    start_time       timestamp,
    end_time         timestamp,
    rows_processed   int,
    error_message    text,
    metadata         text,
    created_at       timestamp
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
    'interaction_schema_version', '1.0.0', 'string', 'Interaction schema version', true, toTimestamp(now()), toTimestamp(now())
);

-- Schema migration tracking
CREATE TABLE IF NOT EXISTS kronop.schema_migrations (
    migration_id     uuid PRIMARY KEY,
    version          text,
    description      text,
    status           text,           -- "pending", "running", "completed", "failed"
    start_time       timestamp,
    end_time         timestamp,
    error_message    text,
    created_at       timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

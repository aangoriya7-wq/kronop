-- Kronop Video Platform - Complete ScyllaDB Schema
-- Optimized for 500M+ users with global scaling
-- Handles Users, Videos, Earnings, and Social Graph

-- Create keyspace for production
CREATE KEYSPACE IF NOT EXISTS kronop 
WITH REPLICATION = {'class': 'NetworkTopologyStrategy', 'dc1': 3}
AND DURABLE_WRITES = true;

-- ========================================
-- USERS TABLES
-- ========================================

-- User Profiles Table
CREATE TABLE IF NOT EXISTS kronop.users (
    user_id          uuid PRIMARY KEY,
    username         text,
    email            text,
    phone            text,
    avatar_url       text,
    bio              text,
    full_name        text,
    date_of_birth    date,
    gender           text,
    location         text,
    website          text,
    is_verified      boolean,
    is_active        boolean,
    is_premium       boolean,
    language         text,
    timezone         text,
    preferences      text,           -- JSON string
    privacy_settings text,           -- JSON string
    notification_settings text,       -- JSON string
    created_at       timestamp,
    updated_at       timestamp,
    last_active       timestamp,
    last_login       timestamp,
    login_count      bigint,
    device_count     int,
    ip_address       inet,
    user_agent       text,
    platform         text,           -- ios, android, web
    version          text
) WITH compaction = {'class': 'LeveledCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- User Authentication Table
CREATE TABLE IF NOT EXISTS kronop.user_auth (
    user_id          uuid PRIMARY KEY,
    password_hash    text,
    salt            text,
    auth_method     text,           -- email, phone, google, facebook, apple
    two_factor_enabled boolean,
    two_factor_secret text,
    recovery_email   text,
    recovery_phone   text,
    security_questions text,         -- JSON string
    failed_attempts  int,
    locked_until     timestamp,
    last_password_change timestamp,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'LeveledCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- User Social Profile Table
CREATE TABLE IF NOT EXISTS kronop.user_social_profile (
    user_id          uuid PRIMARY KEY,
    followers_count  bigint,
    following_count  bigint,
    posts_count      bigint,
    likes_count      bigint,
    shares_count     bigint,
    comments_count   bigint,
    views_count      bigint,
    engagement_rate  float,
    reach            bigint,
    impressions      bigint,
    social_score     float,
    verification_badges list<text>,
    achievements     list<text>,
    rank             text,
    level            int,
    experience_points bigint,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'LeveledCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- ========================================
-- VIDEOS TABLES
-- ========================================

-- Videos Table
CREATE TABLE IF NOT EXISTS kronop.videos (
    video_id         uuid PRIMARY KEY,
    user_id          uuid,
    title            text,
    description      text,
    thumbnail_url    text,
    video_url        text,
    duration         int,            -- seconds
    file_size        bigint,         -- bytes
    format           text,           -- mp4, avi, mov, etc.
    resolution       text,           -- 1080p, 720p, 480p, etc.
    quality          text,           -- hd, sd, 4k, 8k
    category         text,
    tags             list<text>,
    language         text,
    subtitles        list<text>,     -- subtitle languages
    age_rating       text,           -- G, PG, PG-13, R, NC-17
    content_rating    text,           -- general, mature, explicit
    is_public        boolean,
    is_premium       boolean,
    is_featured      boolean,
    is_trending      boolean,
    allow_comments   boolean,
    allow_downloads  boolean,
    monetization     text,           -- enabled, disabled, limited
    license          text,           -- creative commons, all rights reserved, etc.
    location         text,
    recording_date   date,
    upload_date      date,
    published_date   timestamp,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Video Statistics Table
CREATE TABLE IF NOT EXISTS kronop.video_stats (
    video_id         uuid PRIMARY KEY,
    views_count      bigint,
    unique_views     bigint,
    likes_count      bigint,
    dislikes_count   bigint,
    comments_count   bigint,
    shares_count     bigint,
    downloads_count  bigint,
    watch_time       bigint,         -- total watch time in seconds
    avg_watch_time   int,            -- average watch time in seconds
    retention_rate   float,          -- percentage of video watched
    engagement_rate float,
    click_through_rate float,
    bounce_rate      float,
    conversion_rate  float,
    revenue          decimal,
    cost             decimal,
    profit           decimal,
    rank             int,
    score            float,
    trending_score   float,
    quality_score    float,
    performance_score float,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Video Metadata Table
CREATE TABLE IF NOT EXISTS kronop.video_metadata (
    video_id         uuid PRIMARY KEY,
    file_hash        text,
    encoding         text,
    bitrate          int,
    framerate        float,
    aspect_ratio     text,
    color_space      text,
    audio_codec      text,
    video_codec      text,
    container        text,
    size_1080p       bigint,
    size_720p        bigint,
    size_480p        bigint,
    size_360p        bigint,
    has_captions     boolean,
    has_chapters     boolean,
    has_annotations  boolean,
    processing_status text,          -- pending, processing, completed, failed
    upload_speed     float,
    processing_time  int,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'LeveledCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- ========================================
-- EARNINGS TABLES
-- ========================================

-- User Earnings Table
CREATE TABLE IF NOT EXISTS kronop.user_earnings (
    user_id          uuid PRIMARY KEY,
    total_earnings   decimal,
    monthly_earnings decimal,
    weekly_earnings  decimal,
    daily_earnings   decimal,
    balance          decimal,
    withdrawn        decimal,
    pending          decimal,
    currency         text,
    payment_method    text,
    payout_threshold decimal,
    last_payout      timestamp,
    next_payout      timestamp,
    payout_frequency text,           -- daily, weekly, monthly
    auto_payout      boolean,
    tax_info         text,           -- JSON string
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'LeveledCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Video Earnings Table
CREATE TABLE IF NOT EXISTS kronop.video_earnings (
    video_id         uuid PRIMARY KEY,
    user_id          uuid,
    total_earnings   decimal,
    ad_revenue       decimal,
    subscription_revenue decimal,
    donation_revenue decimal,
    sponsorship_revenue decimal,
    merch_revenue    decimal,
    other_revenue    decimal,
    cpm              decimal,        -- cost per mille
    cpc              decimal,        -- cost per click
    cpa              decimal,        -- cost per action
    rpm              decimal,        -- revenue per mille
    views_count      bigint,
    impressions      bigint,
    clicks_count     bigint,
    conversions      int,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'SizeTieredCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Earnings Transactions Table
CREATE TABLE IF NOT EXISTS kronop.earnings_transactions (
    transaction_id    uuid PRIMARY KEY,
    user_id          uuid,
    video_id         uuid,
    type             text,           -- ad, subscription, donation, sponsorship, merch, other
    amount           decimal,
    currency         text,
    status           text,           -- pending, completed, failed, cancelled
    payment_method    text,
    transaction_date timestamp,
    payout_date      timestamp,
    fee              decimal,
    tax              decimal,
    net_amount       decimal,
    description      text,
    metadata         text,           -- JSON string
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'TimeWindowCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- ========================================
-- SOCIAL GRAPH TABLES
-- ========================================

-- Followers Table (Social Graph)
CREATE TABLE IF NOT EXISTS kronop.followers (
    follower_id      uuid,
    following_id     uuid,
    follow_date      timestamp,
    status           text,           -- active, blocked, muted
    created_at       timestamp,
    updated_at       timestamp,
    PRIMARY KEY ((following_id), follower_id)
) WITH CLUSTERING ORDER BY (follower_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Following Table (Reverse Social Graph)
CREATE TABLE IF NOT EXISTS kronop.following (
    user_id          uuid,
    following_id     uuid,
    follow_date      timestamp,
    status           text,           -- active, blocked, muted
    created_at       timestamp,
    updated_at       timestamp,
    PRIMARY KEY ((user_id), following_id)
) WITH CLUSTERING ORDER BY (following_id ASC)
AND compaction = {'class': 'TimeWindowCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- User Interactions Table
CREATE TABLE IF NOT EXISTS kronop.user_interactions (
    user_id          uuid,
    target_id        uuid,
    interaction_type text,           -- like, comment, share, view, follow, unfollow
    target_type      text,           -- video, user, comment
    interaction_date timestamp,
    metadata         text,           -- JSON string
    created_at       timestamp,
    PRIMARY KEY ((user_id), interaction_type, interaction_date, target_id)
) WITH CLUSTERING ORDER BY (interaction_date DESC)
AND compaction = {'class': 'TimeWindowCompactionStrategy'}
AND gc_grace_seconds = 3600;

-- Social Feed Table
CREATE TABLE IF NOT EXISTS kronop.social_feed (
    user_id          uuid,
    feed_item_id     uuid,
    item_type        text,           -- video, post, story, live
    item_id          uuid,
    creator_id       uuid,
    content          text,
    media_url        text,
    engagement_score float,
    timestamp        timestamp,
    created_at       timestamp,
    PRIMARY KEY ((user_id), timestamp DESC, feed_item_id)
) WITH CLUSTERING ORDER BY (timestamp DESC)
AND compaction = {'class': 'TimeWindowCompactionStrategy'}
AND gc_grace_seconds = 7200;

-- ========================================
-- ANALYTICS TABLES
-- ========================================

-- Video Analytics Table
CREATE TABLE IF NOT EXISTS kronop.video_analytics (
    video_id         uuid,
    user_id          uuid,
    session_id       uuid,
    action           text,           -- view, like, comment, share, download, skip, seek
    timestamp        timestamp,
    duration         int,            -- seconds watched
    position         int,            -- position in video
    quality          text,           -- video quality
    device_type      text,
    platform         text,
    location         text,
    referrer         text,
    metadata         text,           -- JSON string
    PRIMARY KEY ((video_id), timestamp DESC, user_id)
) WITH CLUSTERING ORDER BY (timestamp DESC)
AND compaction = {'class': 'TimeWindowCompactionStrategy'}
AND gc_grace_seconds = 3600;

-- User Analytics Table
CREATE TABLE IF NOT EXISTS kronop.user_analytics (
    user_id          uuid,
    session_id       uuid,
    action           text,           -- login, logout, view, like, comment, share, upload
    target_id        uuid,
    target_type      text,
    timestamp        timestamp,
    duration         int,
    device_type      text,
    platform         text,
    location         text,
    referrer         text,
    metadata         text,           -- JSON string
    PRIMARY KEY ((user_id), timestamp DESC, session_id)
) WITH CLUSTERING ORDER BY (timestamp DESC)
AND compaction = {'class': 'TimeWindowCompactionStrategy'}
AND gc_grace_seconds = 7200;

-- ========================================
-- CONTENT MANAGEMENT TABLES
-- ========================================

-- Categories Table
CREATE TABLE IF NOT EXISTS kronop.categories (
    category_id      uuid PRIMARY KEY,
    name             text,
    description      text,
    parent_id        uuid,
    level            int,
    order_index      int,
    is_active        boolean,
    icon_url         text,
    metadata         text,           -- JSON string
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'LeveledCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- Tags Table
CREATE TABLE IF NOT EXISTS kronop.tags (
    tag_id           uuid PRIMARY KEY,
    name             text,
    description      text,
    usage_count      bigint,
    is_trending      boolean,
    category         text,
    metadata         text,           -- JSON string
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'LeveledCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- ========================================
-- SYSTEM TABLES
-- ========================================

-- System Configuration Table
CREATE TABLE IF NOT EXISTS kronop.system_config (
    config_key       text PRIMARY KEY,
    config_value     text,
    config_type      text,
    description      text,
    is_active        boolean,
    created_at       timestamp,
    updated_at       timestamp
) WITH compaction = {'class': 'LeveledCompactionStrategy'}
AND gc_grace_seconds = 86400;

-- System Metrics Table
CREATE TABLE IF NOT EXISTS kronop.system_metrics (
    metric_name      text,
    metric_value     bigint,
    metric_type      text,
    timestamp        timestamp,
    PRIMARY KEY ((metric_name), timestamp DESC)
) WITH CLUSTERING ORDER BY (timestamp DESC)
AND compaction = {'class': 'TimeWindowCompactionStrategy'}
AND gc_grace_seconds = 3600;

-- ========================================
-- INDEXES FOR OPTIMAL PERFORMANCE
-- ========================================

-- User indexes
CREATE INDEX IF NOT EXISTS ON kronop.users (username);
CREATE INDEX IF NOT EXISTS ON kronop.users (email);
CREATE INDEX IF NOT EXISTS ON kronop.users (is_active);
CREATE INDEX IF NOT EXISTS ON kronop.users (is_premium);
CREATE INDEX IF NOT EXISTS ON kronop.users (created_at);
CREATE INDEX IF NOT EXISTS ON kronop.users (last_active);

-- Video indexes
CREATE INDEX IF NOT EXISTS ON kronop.videos (user_id);
CREATE INDEX IF NOT EXISTS ON kronop.videos (category);
CREATE INDEX IF NOT EXISTS ON kronop.videos (is_public);
CREATE INDEX IF NOT EXISTS ON kronop.videos (is_premium);
CREATE INDEX IF NOT EXISTS ON kronop.videos (is_featured);
CREATE INDEX IF NOT EXISTS ON kronop.videos (is_trending);
CREATE INDEX IF NOT EXISTS ON kronop.videos (created_at);
CREATE INDEX IF NOT EXISTS ON kronop.videos (published_date);
CREATE INDEX IF NOT EXISTS ON kronop.videos (tags);

-- Social graph indexes
CREATE INDEX IF NOT EXISTS ON kronop.followers (follower_id);
CREATE INDEX IF NOT EXISTS ON kronop.following (following_id);
CREATE INDEX IF NOT EXISTS ON kronop.user_interactions (target_id);
CREATE INDEX IF NOT EXISTS ON kronop.user_interactions (interaction_type);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS ON kronop.video_analytics (user_id);
CREATE INDEX IF NOT EXISTS ON kronop.video_analytics (action);
CREATE INDEX IF NOT EXISTS ON kronop.user_analytics (action);

-- Earnings indexes
CREATE INDEX IF NOT EXISTS ON kronop.earnings_transactions (user_id);
CREATE INDEX IF NOT EXISTS ON kronop.earnings_transactions (video_id);
CREATE INDEX IF NOT EXISTS ON kronop.earnings_transactions (type);
CREATE INDEX IF NOT EXISTS ON kronop.earnings_transactions (status);

-- ========================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ========================================

-- Trending Videos View
CREATE MATERIALIZED VIEW IF NOT EXISTS kronop.trending_videos AS
    SELECT video_id, title, views_count, likes_count, comments_count, shares_count, 
           engagement_rate, trending_score, created_at
    FROM kronop.video_stats
    WHERE trending_score > 0.5
    PRIMARY KEY (video_id);

-- Top Users View
CREATE MATERIALIZED VIEW IF NOT EXISTS kronop.top_users AS
    SELECT user_id, followers_count, following_count, posts_count, social_score, rank
    FROM kronop.user_social_profile
    WHERE social_score > 0.7
    PRIMARY KEY (user_id);

-- Popular Categories View
CREATE MATERIALIZED VIEW IF NOT EXISTS kronop.popular_categories AS
    SELECT category_id, name, usage_count
    FROM kronop.categories
    WHERE is_active = true
    PRIMARY KEY (category_id);

-- ========================================
-- SAMPLE DATA INSERTION
-- ========================================

-- Insert sample categories
INSERT INTO kronop.categories (category_id, name, description, level, order_index, is_active, created_at, updated_at)
VALUES (
    uuid(), 'Entertainment', 'Entertainment videos and content', 1, 1, true, toTimestamp(now()), toTimestamp(now())
);

INSERT INTO kronop.categories (category_id, name, description, level, order_index, is_active, created_at, updated_at)
VALUES (
    uuid(), 'Education', 'Educational and learning content', 1, 2, true, toTimestamp(now()), toTimestamp(now())
);

INSERT INTO kronop.categories (category_id, name, description, level, order_index, is_active, created_at, updated_at)
VALUES (
    uuid(), 'Gaming', 'Gaming videos and streams', 1, 3, true, toTimestamp(now()), toTimestamp(now())
);

-- Insert sample system configuration
INSERT INTO kronop.system_config (config_key, config_value, config_type, description, is_active, created_at, updated_at)
VALUES (
    'max_video_size', '5368709120', 'integer', 'Maximum video file size in bytes (5GB)', true, toTimestamp(now()), toTimestamp(now())
);

INSERT INTO kronop.system_config (config_key, config_value, config_type, description, is_active, created_at, updated_at)
VALUES (
    'default_video_quality', '1080p', 'string', 'Default video quality for uploads', true, toTimestamp(now()), toTimestamp(now())
);

INSERT INTO kronop.system_config (config_key, config_value, config_type, description, is_active, created_at, updated_at)
VALUES (
    'min_payout_threshold', '50.00', 'decimal', 'Minimum earnings threshold for payout', true, toTimestamp(now()), toTimestamp(now())
);

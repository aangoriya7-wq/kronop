-- SQL - Progress tracking
-- Database schema for video playback analytics and user progress
-- Optimized for high-concurrency access

-- Video metadata table
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bunny_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    url TEXT,
    thumbnail TEXT,
    duration INTEGER, -- seconds
    file_size BIGINT, -- bytes
    resolution VARCHAR(20), -- "1920x1080"
    bitrate INTEGER, -- kbps
    format VARCHAR(10), -- "mp4", "webm"
    category VARCHAR(50),
    tags TEXT, -- JSON array
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Indexes for performance
    INDEX idx_videos_bunny_id (bunny_id),
    INDEX idx_videos_category (category),
    INDEX idx_videos_created (created_at DESC),
    INDEX idx_videos_active (is_active, created_at DESC)
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR(255) NOT NULL,
    video_id INTEGER NOT NULL,
    position_seconds INTEGER DEFAULT 0,
    total_seconds INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    watch_time INTEGER DEFAULT 0, -- total seconds watched
    last_position INTEGER DEFAULT 0, -- last known position
    playback_speed REAL DEFAULT 1.0,
    quality VARCHAR(20) DEFAULT 'auto', -- "720p", "1080p", "auto"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_progress_user_video (user_id, video_id),
    INDEX idx_progress_user (user_id, updated_at DESC),
    INDEX idx_progress_completed (completed, updated_at DESC)
);

-- Analytics tracking
CREATE TABLE IF NOT EXISTS video_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id VARCHAR(255),
    event_type VARCHAR(50) NOT NULL, -- 'play', 'pause', 'seek', 'complete', 'error'
    event_data TEXT, -- JSON with additional event data
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    platform VARCHAR(50), -- 'ios', 'android', 'web'
    network_type VARCHAR(20), -- 'wifi', 'cellular', 'offline'
    buffer_health INTEGER DEFAULT 100, -- percentage
    playback_quality VARCHAR(20), -- experienced quality
    
    -- Foreign key constraint
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    
    -- Indexes for analytics queries
    INDEX idx_analytics_video (video_id, timestamp DESC),
    INDEX idx_analytics_user (user_id, timestamp DESC),
    INDEX idx_analytics_event (event_type, timestamp DESC),
    INDEX idx_analytics_session (session_id, timestamp DESC)
);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'load_time', 'buffer_time', 'fps', 'error_rate'
    metric_value REAL NOT NULL,
    metric_unit VARCHAR(20), -- 'ms', 'fps', 'percentage', 'count'
    sample_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    
    -- Indexes for performance tracking
    INDEX idx_metrics_video_type (video_id, metric_type, created_at DESC),
    INDEX idx_metrics_created (created_at DESC)
);

-- Cache management
CREATE TABLE IF NOT EXISTS cache_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data BLOB NOT NULL,
    cache_size INTEGER NOT NULL,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for cache performance
    INDEX idx_cache_key (cache_key),
    INDEX idx_cache_expires (expires_at),
    INDEX idx_cache_accessed (last_accessed DESC)
);

-- Insert stored procedure for progress update
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS UpdateVideoProgress(
    IN p_user_id VARCHAR(255),
    IN p_video_id INTEGER,
    IN p_position_seconds INTEGER,
    IN p_total_seconds INTEGER,
    IN p_completed BOOLEAN DEFAULT FALSE,
    IN p_session_id VARCHAR(255)
)
BEGIN
    -- Insert or update progress
    INSERT INTO user_progress (
        user_id, video_id, position_seconds, total_seconds, 
        completed, last_position, session_id
    ) VALUES (
        p_user_id, p_video_id, p_position_seconds, p_total_seconds,
        p_completed, p_position_seconds, p_session_id
    )
    ON DUPLICATE KEY UPDATE
    SET 
        position_seconds = p_position_seconds,
        last_position = p_position_seconds,
        completed = p_completed,
        watch_time = CASE 
            WHEN p_completed THEN watch_time + (p_position_seconds - last_position)
            ELSE watch_time + (p_position_seconds - last_position)
        END,
        updated_at = CURRENT_TIMESTAMP;
    
    -- Log analytics event
    INSERT INTO video_analytics (
        video_id, user_id, event_type, event_data, session_id
    ) VALUES (
        p_video_id, p_user_id, 
        CASE WHEN p_completed THEN 'complete' ELSE 'progress' END,
        JSON_OBJECT(
            'position', p_position_seconds,
            'total', p_total_seconds,
            'percentage', ROUND((p_position_seconds / p_total_seconds) * 100, 2)
        ),
        p_session_id
    );
END //
DELIMITER ;

-- Insert stored procedure for performance tracking
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS LogPerformanceMetric(
    IN p_video_id INTEGER,
    IN p_metric_type VARCHAR(50),
    IN p_metric_value REAL,
    IN p_metric_unit VARCHAR(20),
    IN p_sample_count INTEGER DEFAULT 1
)
BEGIN
    INSERT INTO performance_metrics (
        video_id, metric_type, metric_value, metric_unit, sample_count
    ) VALUES (
        p_video_id, p_metric_type, p_metric_value, p_metric_unit, p_sample_count
    );
END //
DELIMITER ;

-- Cleanup procedure for expired cache
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS CleanupExpiredCache()
BEGIN
    DELETE FROM cache_entries 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    SELECT ROW_COUNT() as cleaned_entries;
END //
DELIMITER ;

-- View for active videos with progress
CREATE VIEW IF NOT EXISTS active_videos_with_progress AS
SELECT 
    v.id,
    v.bunny_id,
    v.title,
    v.url,
    v.thumbnail,
    v.duration,
    v.category,
    v.created_at,
    COALESCE(up.position_seconds, 0) as current_position,
    COALESCE(up.total_seconds, v.duration) as total_seconds,
    COALESCE(up.completed, FALSE) as is_completed,
    COALESCE(up.watch_time, 0) as total_watch_time,
    CASE 
        WHEN up.updated_at IS NOT NULL THEN 
            TIMESTAMPDIFF(SECOND, up.updated_at, CURRENT_TIMESTAMP)
        ELSE 0 
    END as last_activity_seconds
FROM videos v
LEFT JOIN user_progress up ON v.id = up.video_id 
    AND up.user_id = 'current_user' -- Would be session user ID
WHERE v.is_active = TRUE;

-- Performance optimization indexes
CREATE INDEX IF NOT EXISTS idx_videos_composite ON videos(is_active, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_composite ON user_progress(user_id, video_id, completed, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_composite ON video_analytics(video_id, event_type, timestamp DESC);

-- Sample data for testing
INSERT IGNORE INTO videos (
    bunny_id, title, url, duration, category, created_at
) VALUES 
('sample_reel_1', 'Amazing Nature Video', 'https://vz-b26a068c-1d9.b-cdn.net/sample1.mp4', 30, 'Nature', NOW()),
('sample_reel_2', 'City Life Timelapse', 'https://vz-b26a068c-1d9.b-cdn.net/sample2.mp4', 45, 'Urban', NOW()),
('sample_reel_3', 'Ocean Waves', 'https://vz-b26a068c-1d9.b-cdn.net/sample3.mp4', 60, 'Nature', NOW());

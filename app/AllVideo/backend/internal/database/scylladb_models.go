/**
 * ScyllaDB Models - Complete Data Structures
 * 
 * Go models for ScyllaDB schema
 * Handles Users, Videos, Earnings, and Social Graph
 * Optimized for 500M+ users with global scaling
 * 
 * Features:
 * - Complete user management
 * - Video content management
 * - Earnings and monetization
 * - Social graph relationships
 * - Analytics and metrics
 */

package database

import (
	"time"
	"github.com/google/uuid"
)

// ========================================
// USER MODELS
// ========================================

// User represents a user profile
type User struct {
	UserID              uuid.UUID  `json:"user_id" db:"user_id"`
	Username            string    `json:"username" db:"username"`
	Email               string    `json:"email" db:"email"`
	Phone               string    `json:"phone" db:"phone"`
	AvatarURL           string    `json:"avatar_url" db:"avatar_url"`
	Bio                 string    `json:"bio" db:"bio"`
	FullName            string    `json:"full_name" db:"full_name"`
	DateOfBirth         time.Time `json:"date_of_birth" db:"date_of_birth"`
	Gender              string    `json:"gender" db:"gender"`
	Location            string    `json:"location" db:"location"`
	Website             string    `json:"website" db:"website"`
	IsVerified          bool      `json:"is_verified" db:"is_verified"`
	IsActive            bool      `json:"is_active" db:"is_active"`
	IsPremium           bool      `json:"is_premium" db:"is_premium"`
	Language            string    `json:"language" db:"language"`
	Timezone            string    `json:"timezone" db:"timezone"`
	Preferences         string    `json:"preferences" db:"preferences"`         // JSON string
	PrivacySettings     string    `json:"privacy_settings" db:"privacy_settings"` // JSON string
	NotificationSettings string    `json:"notification_settings" db:"notification_settings"` // JSON string
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
	LastActive          time.Time `json:"last_active" db:"last_active"`
	LastLogin           time.Time `json:"last_login" db:"last_login"`
	LoginCount          int64     `json:"login_count" db:"login_count"`
	DeviceCount         int       `json:"device_count" db:"device_count"`
	IPAddress           string    `json:"ip_address" db:"ip_address"`
	UserAgent           string    `json:"user_agent" db:"user_agent"`
	Platform            string    `json:"platform" db:"platform"` // ios, android, web
	Version             string    `json:"version" db:"version"`
}

// UserAuth represents user authentication data
type UserAuth struct {
	UserID              uuid.UUID  `json:"user_id" db:"user_id"`
	PasswordHash        string    `json:"password_hash" db:"password_hash"`
	Salt                string    `json:"salt" db:"salt"`
	AuthMethod          string    `json:"auth_method" db:"auth_method"` // email, phone, google, facebook, apple
	TwoFactorEnabled    bool      `json:"two_factor_enabled" db:"two_factor_enabled"`
	TwoFactorSecret     string    `json:"two_factor_secret" db:"two_factor_secret"`
	RecoveryEmail       string    `json:"recovery_email" db:"recovery_email"`
	RecoveryPhone       string    `json:"recovery_phone" db:"recovery_phone"`
	SecurityQuestions   string    `json:"security_questions" db:"security_questions"` // JSON string
	FailedAttempts      int       `json:"failed_attempts" db:"failed_attempts"`
	LockedUntil         time.Time `json:"locked_until" db:"locked_until"`
	LastPasswordChange  time.Time `json:"last_password_change" db:"last_password_change"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// UserSocialProfile represents user social profile
type UserSocialProfile struct {
	UserID              uuid.UUID  `json:"user_id" db:"user_id"`
	FollowersCount      int64     `json:"followers_count" db:"followers_count"`
	FollowingCount      int64     `json:"following_count" db:"following_count"`
	PostsCount          int64     `json:"posts_count" db:"posts_count"`
	LikesCount          int64     `json:"likes_count" db:"likes_count"`
	SharesCount         int64     `json:"shares_count" db:"shares_count"`
	CommentsCount       int64     `json:"comments_count" db:"comments_count"`
	ViewsCount          int64     `json:"views_count" db:"views_count"`
	EngagementRate      float64   `json:"engagement_rate" db:"engagement_rate"`
	Reach               int64     `json:"reach" db:"reach"`
	Impressions         int64     `json:"impressions" db:"impressions"`
	SocialScore         float64   `json:"social_score" db:"social_score"`
	VerificationBadges  []string  `json:"verification_badges" db:"verification_badges"`
	Achievements        []string  `json:"achievements" db:"achievements"`
	Rank                string    `json:"rank" db:"rank"`
	Level               int       `json:"level" db:"level"`
	ExperiencePoints    int64     `json:"experience_points" db:"experience_points"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// ========================================
// VIDEO MODELS
// ========================================

// Video represents a video
type Video struct {
	VideoID             uuid.UUID  `json:"video_id" db:"video_id"`
	UserID              uuid.UUID  `json:"user_id" db:"user_id"`
	Title               string    `json:"title" db:"title"`
	Description         string    `json:"description" db:"description"`
	ThumbnailURL        string    `json:"thumbnail_url" db:"thumbnail_url"`
	VideoURL            string    `json:"video_url" db:"video_url"`
	Duration            int       `json:"duration" db:"duration"` // seconds
	FileSize            int64     `json:"file_size" db:"file_size"` // bytes
	Format              string    `json:"format" db:"format"` // mp4, avi, mov, etc.
	Resolution          string    `json:"resolution" db:"resolution"` // 1080p, 720p, 480p, etc.
	Quality             string    `json:"quality" db:"quality"` // hd, sd, 4k, 8k
	Category            string    `json:"category" db:"category"`
	Tags                []string  `json:"tags" db:"tags"`
	Language            string    `json:"language" db:"language"`
	Subtitles           []string  `json:"subtitles" db:"subtitles"` // subtitle languages
	AgeRating           string    `json:"age_rating" db:"age_rating"` // G, PG, PG-13, R, NC-17
	ContentRating       string    `json:"content_rating" db:"content_rating"` // general, mature, explicit
	IsPublic            bool      `json:"is_public" db:"is_public"`
	IsPremium           bool      `json:"is_premium" db:"is_premium"`
	IsFeatured          bool      `json:"is_featured" db:"is_featured"`
	IsTrending          bool      `json:"is_trending" db:"is_trending"`
	AllowComments       bool      `json:"allow_comments" db:"allow_comments"`
	AllowDownloads      bool      `json:"allow_downloads" db:"allow_downloads"`
	Monetization        string    `json:"monetization" db:"monetization"` // enabled, disabled, limited
	License             string    `json:"license" db:"license"` // creative commons, all rights reserved, etc.
	Location            string    `json:"location" db:"location"`
	RecordingDate       time.Time `json:"recording_date" db:"recording_date"`
	UploadDate          time.Time `json:"upload_date" db:"upload_date"`
	PublishedDate       time.Time `json:"published_date" db:"published_date"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// VideoStats represents video statistics
type VideoStats struct {
	VideoID             uuid.UUID  `json:"video_id" db:"video_id"`
	ViewsCount          int64     `json:"views_count" db:"views_count"`
	UniqueViews         int64     `json:"unique_views" db:"unique_views"`
	LikesCount          int64     `json:"likes_count" db:"likes_count"`
	DislikesCount       int64     `json:"dislikes_count" db:"dislikes_count"`
	CommentsCount       int64     `json:"comments_count" db:"comments_count"`
	SharesCount         int64     `json:"shares_count" db:"shares_count"`
	DownloadsCount      int64     `json:"downloads_count" db:"downloads_count"`
	WatchTime           int64     `json:"watch_time" db:"watch_time"` // total watch time in seconds
	AvgWatchTime        int       `json:"avg_watch_time" db:"avg_watch_time"` // average watch time in seconds
	RetentionRate       float64   `json:"retention_rate" db:"retention_rate"` // percentage of video watched
	EngagementRate      float64   `json:"engagement_rate" db:"engagement_rate"`
	ClickThroughRate    float64   `json:"click_through_rate" db:"click_through_rate"`
	BounceRate          float64   `json:"bounce_rate" db:"bounce_rate"`
	ConversionRate      float64   `json:"conversion_rate" db:"conversion_rate"`
	Revenue             float64   `json:"revenue" db:"revenue"`
	Cost                float64   `json:"cost" db:"cost"`
	Profit              float64   `json:"profit" db:"profit"`
	Rank                int       `json:"rank" db:"rank"`
	Score               float64   `json:"score" db:"score"`
	TrendingScore       float64   `json:"trending_score" db:"trending_score"`
	QualityScore        float64   `json:"quality_score" db:"quality_score"`
	PerformanceScore    float64   `json:"performance_score" db:"performance_score"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// VideoMetadata represents video metadata
type VideoMetadata struct {
	VideoID             uuid.UUID  `json:"video_id" db:"video_id"`
	FileHash            string    `json:"file_hash" db:"file_hash"`
	Encoding            string    `json:"encoding" db:"encoding"`
	Bitrate             int       `json:"bitrate" db:"bitrate"`
	Framerate           float64   `json:"framerate" db:"framerate"`
	AspectRatio         string    `json:"aspect_ratio" db:"aspect_ratio"`
	ColorSpace          string    `json:"color_space" db:"color_space"`
	AudioCodec          string    `json:"audio_codec" db:"audio_codec"`
	VideoCodec          string    `json:"video_codec" db:"video_codec"`
	Container           string    `json:"container" db:"container"`
	Size1080p           int64     `json:"size_1080p" db:"size_1080p"`
	Size720p            int64     `json:"size_720p" db:"size_720p"`
	Size480p            int64     `json:"size_480p" db:"size_480p"`
	Size360p            int64     `json:"size_360p" db:"size_360p"`
	HasCaptions         bool      `json:"has_captions" db:"has_captions"`
	HasChapters         bool      `json:"has_chapters" db:"has_chapters"`
	HasAnnotations      bool      `json:"has_annotations" db:"has_annotations"`
	ProcessingStatus    string    `json:"processing_status" db:"processing_status"` // pending, processing, completed, failed
	UploadSpeed         float64   `json:"upload_speed" db:"upload_speed"`
	ProcessingTime      int       `json:"processing_time" db:"processing_time"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// ========================================
// EARNINGS MODELS
// ========================================

// UserEarnings represents user earnings
type UserEarnings struct {
	UserID              uuid.UUID  `json:"user_id" db:"user_id"`
	TotalEarnings       float64   `json:"total_earnings" db:"total_earnings"`
	MonthlyEarnings     float64   `json:"monthly_earnings" db:"monthly_earnings"`
	WeeklyEarnings      float64   `json:"weekly_earnings" db:"weekly_earnings"`
	DailyEarnings       float64   `json:"daily_earnings" db:"daily_earnings"`
	Balance             float64   `json:"balance" db:"balance"`
	Withdrawn           float64   `json:"withdrawn" db:"withdrawn"`
	Pending             float64   `json:"pending" db:"pending"`
	Currency            string    `json:"currency" db:"currency"`
	PaymentMethod       string    `json:"payment_method" db:"payment_method"`
	PayoutThreshold     float64   `json:"payout_threshold" db:"payout_threshold"`
	LastPayout          time.Time `json:"last_payout" db:"last_payout"`
	NextPayout          time.Time `json:"next_payout" db:"next_payout"`
	PayoutFrequency     string    `json:"payout_frequency" db:"payout_frequency"` // daily, weekly, monthly
	AutoPayout          bool      `json:"auto_payout" db:"auto_payout"`
	TaxInfo             string    `json:"tax_info" db:"tax_info"` // JSON string
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// VideoEarnings represents video earnings
type VideoEarnings struct {
	VideoID                 uuid.UUID  `json:"video_id" db:"video_id"`
	UserID                  uuid.UUID  `json:"user_id" db:"user_id"`
	TotalEarnings            float64   `json:"total_earnings" db:"total_earnings"`
	AdRevenue               float64   `json:"ad_revenue" db:"ad_revenue"`
	SubscriptionRevenue     float64   `json:"subscription_revenue" db:"subscription_revenue"`
	DonationRevenue         float64   `json:"donation_revenue" db:"donation_revenue"`
	SponsorshipRevenue       float64   `json:"sponsorship_revenue" db:"sponsorship_revenue"`
	MerchRevenue             float64   `json:"merch_revenue" db:"merch_revenue"`
	OtherRevenue             float64   `json:"other_revenue" db:"other_revenue"`
	CPM                     float64   `json:"cpm" db:"cpm"` // cost per mille
	CPC                     float64   `json:"cpc" db:"cpc"` // cost per click
	CPA                     float64   `json:"cpa" db:"cpa"` // cost per action
	RPM                     float64   `json:"rpm" db:"rpm"` // revenue per mille
	ViewsCount              int64     `json:"views_count" db:"views_count"`
	Impressions             int64     `json:"impressions" db:"impressions"`
	ClicksCount             int64     `json:"clicks_count" db:"clicks_count"`
	Conversions             int       `json:"conversions" db:"conversions"`
	CreatedAt               time.Time `json:"created_at" db:"created_at"`
	UpdatedAt               time.Time `json:"updated_at" db:"updated_at"`
}

// EarningsTransaction represents earnings transaction
type EarningsTransaction struct {
	TransactionID          uuid.UUID  `json:"transaction_id" db:"transaction_id"`
	UserID                  uuid.UUID  `json:"user_id" db:"user_id"`
	VideoID                 uuid.UUID  `json:"video_id" db:"video_id"`
	Type                    string    `json:"type" db:"type"` // ad, subscription, donation, sponsorship, merch, other
	Amount                  float64   `json:"amount" db:"amount"`
	Currency                string    `json:"currency" db:"currency"`
	Status                  string    `json:"status" db:"status"` // pending, completed, failed, cancelled
	PaymentMethod           string    `json:"payment_method" db:"payment_method"`
	TransactionDate         time.Time `json:"transaction_date" db:"transaction_date"`
	PayoutDate              time.Time `json:"payout_date" db:"payout_date"`
	Fee                     float64   `json:"fee" db:"fee"`
	Tax                     float64   `json:"tax" db:"tax"`
	NetAmount               float64   `json:"net_amount" db:"net_amount"`
	Description             string    `json:"description" db:"description"`
	Metadata                string    `json:"metadata" db:"metadata"` // JSON string
	CreatedAt               time.Time `json:"created_at" db:"created_at"`
	UpdatedAt               time.Time `json:"updated_at" db:"updated_at"`
}

// ========================================
// SOCIAL GRAPH MODELS
// ========================================

// Follower represents a follower relationship
type Follower struct {
	FollowerID          uuid.UUID  `json:"follower_id" db:"follower_id"`
	FollowingID         uuid.UUID  `json:"following_id" db:"following_id"`
	FollowDate          time.Time `json:"follow_date" db:"follow_date"`
	Status              string    `json:"status" db:"status"` // active, blocked, muted
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// Following represents a following relationship
type Following struct {
	UserID              uuid.UUID  `json:"user_id" db:"user_id"`
	FollowingID         uuid.UUID  `json:"following_id" db:"following_id"`
	FollowDate          time.Time `json:"follow_date" db:"follow_date"`
	Status              string    `json:"status" db:"status"` // active, blocked, muted
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// UserInteraction represents user interaction
type UserInteraction struct {
	UserID              uuid.UUID  `json:"user_id" db:"user_id"`
	TargetID            uuid.UUID  `json:"target_id" db:"target_id"`
	InteractionType     string    `json:"interaction_type" db:"interaction_type"` // like, comment, share, view, follow, unfollow
	TargetType          string    `json:"target_type" db:"target_type"` // video, user, comment
	InteractionDate     time.Time `json:"interaction_date" db:"interaction_date"`
	Metadata            string    `json:"metadata" db:"metadata"` // JSON string
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
}

// SocialFeed represents social feed item
type SocialFeed struct {
	UserID              uuid.UUID  `json:"user_id" db:"user_id"`
	FeedItemID          uuid.UUID  `json:"feed_item_id" db:"feed_item_id"`
	ItemType            string    `json:"item_type" db:"item_type"` // video, post, story, live
	ItemID              uuid.UUID  `json:"item_id" db:"item_id"`
	CreatorID           uuid.UUID  `json:"creator_id" db:"creator_id"`
	Content             string    `json:"content" db:"content"`
	MediaURL            string    `json:"media_url" db:"media_url"`
	EngagementScore     float64   `json:"engagement_score" db:"engagement_score"`
	Timestamp           time.Time `json:"timestamp" db:"timestamp"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
}

// ========================================
// ANALYTICS MODELS
// ========================================

// VideoAnalytics represents video analytics
type VideoAnalytics struct {
	VideoID             uuid.UUID  `json:"video_id" db:"video_id"`
	UserID              uuid.UUID  `json:"user_id" db:"user_id"`
	SessionID           uuid.UUID  `json:"session_id" db:"session_id"`
	Action              string    `json:"action" db:"action"` // view, like, comment, share, download, skip, seek
	Timestamp           time.Time `json:"timestamp" db:"timestamp"`
	Duration            int       `json:"duration" db:"duration"` // seconds watched
	Position            int       `json:"position" db:"position"` // position in video
	Quality             string    `json:"quality" db:"quality"` // video quality
	DeviceType          string    `json:"device_type" db:"device_type"`
	Platform            string    `json:"platform" db:"platform"`
	Location            string    `json:"location" db:"location"`
	Referrer            string    `json:"referrer" db:"referrer"`
	Metadata            string    `json:"metadata" db:"metadata"` // JSON string
}

// UserAnalytics represents user analytics
type UserAnalytics struct {
	UserID              uuid.UUID  `json:"user_id" db:"user_id"`
	SessionID           uuid.UUID  `json:"session_id" db:"session_id"`
	Action              string    `json:"action" db:"action"` // login, logout, view, like, comment, share, upload
	TargetID            uuid.UUID  `json:"target_id" db:"target_id"`
	TargetType          string    `json:"target_type" db:"target_type"`
	Timestamp           time.Time `json:"timestamp" db:"timestamp"`
	Duration            int       `json:"duration" db:"duration"`
	DeviceType          string    `json:"device_type" db:"device_type"`
	Platform            string    `json:"platform" db:"platform"`
	Location            string    `json:"location" db:"location"`
	Referrer            string    `json:"referrer" db:"referrer"`
	Metadata            string    `json:"metadata" db:"metadata"` // JSON string
}

// ========================================
// CONTENT MANAGEMENT MODELS
// ========================================

// Category represents a category
type Category struct {
	CategoryID          uuid.UUID  `json:"category_id" db:"category_id"`
	Name                string    `json:"name" db:"name"`
	Description         string    `json:"description" db:"description"`
	ParentID            uuid.UUID  `json:"parent_id" db:"parent_id"`
	Level               int       `json:"level" db:"level"`
	OrderIndex          int       `json:"order_index" db:"order_index"`
	IsActive            bool      `json:"is_active" db:"is_active"`
	IconURL             string    `json:"icon_url" db:"icon_url"`
	Metadata            string    `json:"metadata" db:"metadata"` // JSON string
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// Tag represents a tag
type Tag struct {
	TagID               uuid.UUID  `json:"tag_id" db:"tag_id"`
	Name                string    `json:"name" db:"name"`
	Description         string    `json:"description" db:"description"`
	UsageCount          int64     `json:"usage_count" db:"usage_count"`
	IsTrending          bool      `json:"is_trending" db:"is_trending"`
	Category            string    `json:"category" db:"category"`
	Metadata            string    `json:"metadata" db:"metadata"` // JSON string
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// ========================================
// SYSTEM MODELS
// ========================================

// SystemConfig represents system configuration
type SystemConfig struct {
	ConfigKey           string    `json:"config_key" db:"config_key"`
	ConfigValue         string    `json:"config_value" db:"config_value"`
	ConfigType          string    `json:"config_type" db:"config_type"`
	Description         string    `json:"description" db:"description"`
	IsActive            bool      `json:"is_active" db:"is_active"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// SystemMetrics represents system metrics
type SystemMetrics struct {
	MetricName          string    `json:"metric_name" db:"metric_name"`
	MetricValue         int64     `json:"metric_value" db:"metric_value"`
	MetricType          string    `json:"metric_type" db:"metric_type"`
	Timestamp           time.Time `json:"timestamp" db:"timestamp"`
}

// ========================================
// RESPONSE MODELS
// ========================================

// UserResponse represents user response
type UserResponse struct {
	User              *User              `json:"user"`
	SocialProfile     *UserSocialProfile `json:"social_profile"`
	Auth              *UserAuth          `json:"auth,omitempty"`
	FollowersCount    int64              `json:"followers_count"`
	FollowingCount    int64              `json:"following_count"`
	IsFollowing       bool               `json:"is_following"`
	IsFollowedBy      bool               `json:"is_followed_by"`
}

// VideoResponse represents video response
type VideoResponse struct {
	Video             *Video             `json:"video"`
	Stats             *VideoStats         `json:"stats"`
	Metadata          *VideoMetadata      `json:"metadata"`
	User              *User              `json:"user"`
	IsLiked           bool               `json:"is_liked"`
	IsBookmarked      bool               `json:"is_bookmarked"`
	IsSubscribed      bool               `json:"is_subscribed"`
	RelatedVideos     []*Video           `json:"related_videos,omitempty"`
	Comments          []*Comment         `json:"comments,omitempty"`
}

// EarningsResponse represents earnings response
type EarningsResponse struct {
	UserEarnings       *UserEarnings       `json:"user_earnings"`
	VideoEarnings      []*VideoEarnings    `json:"video_earnings"`
	Transactions       []*EarningsTransaction `json:"transactions"`
	TotalRevenue       float64             `json:"total_revenue"`
	TotalViews         int64               `json:"total_views"`
	CPM                float64             `json:"cpm"`
	RPM                float64             `json:"rpm"`
}

// SocialGraphResponse represents social graph response
type SocialGraphResponse struct {
	Followers          []*User             `json:"followers"`
	Following          []*User             `json:"following"`
	MutualFollowers    []*User             `json:"mutual_followers"`
	SuggestedFollowers  []*User             `json:"suggested_followers"`
	FollowersCount     int64               `json:"followers_count"`
	FollowingCount     int64               `json:"following_count"`
	MutualFollowersCount int64             `json:"mutual_followers_count"`
}

// ========================================
// FILTER AND PAGINATION MODELS
// ========================================

// UserFilter represents user filter
type UserFilter struct {
	Username           string    `json:"username"`
	Email              string    `json:"email"`
	IsActive           *bool     `json:"is_active"`
	IsPremium          *bool     `json:"is_premium"`
	IsVerified         *bool     `json:"is_verified"`
	Location           string    `json:"location"`
	CreatedAfter       *time.Time `json:"created_after"`
	CreatedBefore      *time.Time `json:"created_before"`
	LastActiveAfter    *time.Time `json:"last_active_after"`
	LastActiveBefore   *time.Time `json:"last_active_before"`
	SortBy            string    `json:"sort_by"` // created_at, last_active, followers_count
	SortOrder         string    `json:"sort_order"` // asc, desc
	Limit             int       `json:"limit"`
	Offset            int       `json:"offset"`
}

// VideoFilter represents video filter
type VideoFilter struct {
	UserID             uuid.UUID `json:"user_id"`
	Title              string    `json:"title"`
	Description        string    `json:"description"`
	Category           string    `json:"category"`
	Tags               []string  `json:"tags"`
	Language           string    `json:"language"`
	IsPublic           *bool     `json:"is_public"`
	IsPremium          *bool     `json:"is_premium"`
	IsFeatured         *bool     `json:"is_featured"`
	IsTrending         *bool     `json:"is_trending"`
	CreatedAfter       *time.Time `json:"created_after"`
	CreatedBefore      *time.Time `json:"created_before"`
	PublishedAfter     *time.Time `json:"published_after"`
	PublishedBefore    *time.Time `json:"published_before"`
	DurationMin        *int      `json:"duration_min"`
	DurationMax        *int      `json:"duration_max"`
	SortBy             string    `json:"sort_by"` // created_at, published_date, views_count, likes_count
	SortOrder          string    `json:"sort_order"` // asc, desc
	Limit              int       `json:"limit"`
	Offset             int       `json:"offset"`
}

// Pagination represents pagination
type Pagination struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
	HasNext    bool  `json:"has_next"`
	HasPrev    bool  `json:"has_prev"`
}

// ========================================
// VALIDATION MODELS
// ========================================

// ValidationError represents validation error
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Code    string `json:"code"`
}

// ValidationResult represents validation result
type ValidationResult struct {
	IsValid bool               `json:"is_valid"`
	Errors  []ValidationError `json:"errors"`
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// NewUser creates a new user
func NewUser() *User {
	now := time.Now()
	return &User{
		UserID:              uuid.New(),
		IsActive:            true,
		IsPremium:           false,
		IsVerified:          false,
		CreatedAt:           now,
		UpdatedAt:           now,
		LastActive:          now,
		LoginCount:          0,
		DeviceCount:         1,
	}
}

// NewVideo creates a new video
func NewVideo() *Video {
	now := time.Now()
	return &Video{
		VideoID:             uuid.New(),
		IsPublic:            true,
		IsPremium:           false,
		IsFeatured:          false,
		IsTrending:          false,
		AllowComments:       true,
		AllowDownloads:      false,
		Monetization:        "disabled",
		License:             "all_rights_reserved",
		UploadDate:          now,
		CreatedAt:           now,
		UpdatedAt:           now,
	}
}

// NewVideoStats creates new video stats
func NewVideoStats() *VideoStats {
	now := time.Now()
	return &VideoStats{
		ViewsCount:          0,
		UniqueViews:         0,
		LikesCount:          0,
		DislikesCount:       0,
		CommentsCount:       0,
		SharesCount:         0,
		DownloadsCount:      0,
		WatchTime:           0,
		AvgWatchTime:        0,
		RetentionRate:       0.0,
		EngagementRate:      0.0,
		ClickThroughRate:    0.0,
		BounceRate:          0.0,
		ConversionRate:      0.0,
		Revenue:             0.0,
		Cost:                0.0,
		Profit:              0.0,
		Rank:                0,
		Score:               0.0,
		TrendingScore:       0.0,
		QualityScore:        0.0,
		PerformanceScore:    0.0,
		CreatedAt:           now,
		UpdatedAt:           now,
	}
}

// NewUserEarnings creates new user earnings
func NewUserEarnings() *UserEarnings {
	now := time.Now()
	return &UserEarnings{
		TotalEarnings:       0.0,
		MonthlyEarnings:     0.0,
		WeeklyEarnings:      0.0,
		DailyEarnings:       0.0,
		Balance:             0.0,
		Withdrawn:           0.0,
		Pending:             0.0,
		Currency:            "USD",
		PayoutThreshold:     50.0,
		PayoutFrequency:     "monthly",
		AutoPayout:          false,
		CreatedAt:           now,
		UpdatedAt:           now,
	}
}

// NewFollower creates a new follower relationship
func NewFollower(followerID, followingID uuid.UUID) *Follower {
	now := time.Now()
	return &Follower{
		FollowerID:          followerID,
		FollowingID:         followingID,
		FollowDate:          now,
		Status:              "active",
		CreatedAt:           now,
		UpdatedAt:           now,
	}
}

// NewFollowing creates a new following relationship
func NewFollowing(userID, followingID uuid.UUID) *Following {
	now := time.Now()
	return &Following{
		UserID:              userID,
		FollowingID:         followingID,
		FollowDate:          now,
		Status:              "active",
		CreatedAt:           now,
		UpdatedAt:           now,
	}
}

// NewUserInteraction creates a new user interaction
func NewUserInteraction(userID, targetID uuid.UUID, interactionType, targetType string) *UserInteraction {
	now := time.Now()
	return &UserInteraction{
		UserID:              userID,
		TargetID:            targetID,
		InteractionType:     interactionType,
		TargetType:          targetType,
		InteractionDate:     now,
		CreatedAt:           now,
	}
}

// NewVideoAnalytics creates new video analytics
func NewVideoAnalytics(videoID, userID, sessionID uuid.UUID, action string) *VideoAnalytics {
	now := time.Now()
	return &VideoAnalytics{
		VideoID:             videoID,
		UserID:              userID,
		SessionID:           sessionID,
		Action:              action,
		Timestamp:           now,
		Duration:            0,
		Position:            0,
		CreatedAt:           now,
	}
}

// NewUserAnalytics creates new user analytics
func NewUserAnalytics(userID, sessionID uuid.UUID, action string) *UserAnalytics {
	now := time.Now()
	return &UserAnalytics{
		UserID:              userID,
		SessionID:           sessionID,
		Action:              action,
		Timestamp:           now,
		Duration:            0,
		CreatedAt:           now,
	}
}

// ========================================
// HELPER FUNCTIONS
// ========================================

// GetTableName returns table name for model
func (u *User) GetTableName() string {
	return "users"
}

func (v *Video) GetTableName() string {
	return "videos"
}

func (vs *VideoStats) GetTableName() string {
	return "video_stats"
}

func (ue *UserEarnings) GetTableName() string {
	return "user_earnings"
}

func (ve *VideoEarnings) GetTableName() string {
	return "video_earnings"
}

func (f *Follower) GetTableName() string {
	return "followers"
}

func (f *Following) GetTableName() string {
	return "following"
}

func (ui *UserInteraction) GetTableName() string {
	return "user_interactions"
}

func (va *VideoAnalytics) GetTableName() string {
	return "video_analytics"
}

func (ua *UserAnalytics) GetTableName() string {
	return "user_analytics"
}

// GetPrimaryKey returns primary key for model
func (u *User) GetPrimaryKey() string {
	return u.UserID.String()
}

func (v *Video) GetPrimaryKey() string {
	return v.VideoID.String()
}

func (vs *VideoStats) GetPrimaryKey() string {
	return vs.VideoID.String()
}

func (ue *UserEarnings) GetPrimaryKey() string {
	return ue.UserID.String()
}

func (ve *VideoEarnings) GetPrimaryKey() string {
	return ve.VideoID.String()
}

// IsValid checks if model is valid
func (u *User) IsValid() *ValidationResult {
	var errors []ValidationError
	
	if u.UserID == uuid.Nil {
		errors = append(errors, ValidationError{
			Field:   "user_id",
			Message: "user_id is required",
			Code:    "required",
		})
	}
	
	if u.Username == "" {
		errors = append(errors, ValidationError{
			Field:   "username",
			Message: "username is required",
			Code:    "required",
		})
	}
	
	if u.Email == "" {
		errors = append(errors, ValidationError{
			Field:   "email",
			Message: "email is required",
			Code:    "required",
		})
	}
	
	return &ValidationResult{
		IsValid: len(errors) == 0,
		Errors:  errors,
	}
}

func (v *Video) IsValid() *ValidationResult {
	var errors []ValidationError
	
	if v.VideoID == uuid.Nil {
		errors = append(errors, ValidationError{
			Field:   "video_id",
			Message: "video_id is required",
			Code:    "required",
		})
	}
	
	if v.UserID == uuid.Nil {
		errors = append(errors, ValidationError{
			Field:   "user_id",
			Message: "user_id is required",
			Code:    "required",
		})
	}
	
	if v.Title == "" {
		errors = append(errors, ValidationError{
			Field:   "title",
			Message: "title is required",
			Code:    "required",
		})
	}
	
	if v.Duration <= 0 {
		errors = append(errors, ValidationError{
			Field:   "duration",
			Message: "duration must be greater than 0",
			Code:    "invalid",
		})
	}
	
	return &ValidationResult{
		IsValid: len(errors) == 0,
		Errors:  errors,
	}
}

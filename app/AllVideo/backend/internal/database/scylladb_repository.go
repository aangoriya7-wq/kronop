/**
 * ScyllaDB Repository - Complete Data Access Layer
 * 
 * Go repository for ScyllaDB operations
 * Handles Users, Videos, Earnings, and Social Graph
 * Optimized for 500M+ users with global scaling
 * 
 * Features:
 * - Complete CRUD operations
 * - Batch operations
 * - Pagination and filtering
 * - Caching integration
 * - Performance optimization
 */

package database

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gocql/gocql"
	"github.com/scylladb/gocqlx/v2"
	"github.com/scylladb/gocqlx/v2/qb"
	"github.com/google/uuid"
)

// ScyllaDBRepository handles database operations
type ScyllaDBRepository struct {
	session *gocqlx.Session
	cache   RedisGlobalCache
	config  ScyllaConfig
}

// NewScyllaDBRepository creates a new repository
func NewScyllaDBRepository(session *gocqlx.Session, cache RedisGlobalCache, config ScyllaConfig) *ScyllaDBRepository {
	return &ScyllaDBRepository{
		session: session,
		cache:   cache,
		config:  config,
	}
}

// ========================================
// USER OPERATIONS
// ========================================

// CreateUser creates a new user
func (r *ScyllaDBRepository) CreateUser(ctx context.Context, user *User) error {
	query := qb.Insert("users").
		Columns("user_id", "username", "email", "phone", "avatar_url", "bio", "full_name",
			"date_of_birth", "gender", "location", "website", "is_verified", "is_active",
			"is_premium", "language", "timezone", "preferences", "privacy_settings",
			"notification_settings", "created_at", "updated_at", "last_active", "last_login",
			"login_count", "device_count", "ip_address", "user_agent", "platform", "version").
		ToCql()

	err := r.session.Queryctx(ctx, query,
		user.UserID, user.Username, user.Email, user.Phone, user.AvatarURL, user.Bio, user.FullName,
		user.DateOfBirth, user.Gender, user.Location, user.Website, user.IsVerified, user.IsActive,
		user.IsPremium, user.Language, user.Timezone, user.Preferences, user.PrivacySettings,
		user.NotificationSettings, user.CreatedAt, user.UpdatedAt, user.LastActive, user.LastLogin,
		user.LoginCount, user.DeviceCount, user.IPAddress, user.UserAgent, user.Platform, user.Version)

	if err != nil {
		return fmt.Errorf("failed to create user: %w", err)
	}

	// Cache user data
	if r.cache.IsReady() {
		userData := &cache.UserCacheData{
			UserID:        user.UserID.String(),
			Username:      user.Username,
			Email:         user.Email,
			Avatar:        user.AvatarURL,
			Preferences:   user.Preferences,
			LastActive:    user.LastActive,
		}
		r.cache.CacheUserSession(ctx, userData)
	}

	log.Printf("👤 User created: %s", user.UserID)
	return nil
}

// GetUserByID retrieves user by ID
func (r *ScyllaDBRepository) GetUserByID(ctx context.Context, userID uuid.UUID) (*User, error) {
	// Try cache first
	if r.cache.IsReady() {
		userData, err := r.cache.GetUserSession(ctx, userID.String())
		if err == nil {
			user := &User{
				UserID:    uuid.MustParse(userData.UserID),
				Username:  userData.Username,
				Email:     userData.Email,
				AvatarURL: userData.Avatar,
				LastActive: userData.LastActive,
			}
			return user, nil
		}
	}

	// Query database
	query := qb.Select("users").
		Columns("user_id", "username", "email", "phone", "avatar_url", "bio", "full_name",
			"date_of_birth", "gender", "location", "website", "is_verified", "is_active",
			"is_premium", "language", "timezone", "preferences", "privacy_settings",
			"notification_settings", "created_at", "updated_at", "last_active", "last_login",
			"login_count", "device_count", "ip_address", "user_agent", "platform", "version").
		Where(qb.Eq("user_id", userID)).
		ToCql()

	var user User
	err := r.session.Queryctx(ctx, query, userID).Get(
		&user.UserID, &user.Username, &user.Email, &user.Phone, &user.AvatarURL, &user.Bio, &user.FullName,
		&user.DateOfBirth, &user.Gender, &user.Location, &user.Website, &user.IsVerified, &user.IsActive,
		&user.IsPremium, &user.Language, &user.Timezone, &user.Preferences, &user.PrivacySettings,
		&user.NotificationSettings, &user.CreatedAt, &user.UpdatedAt, &user.LastActive, &user.LastLogin,
		&user.LoginCount, &user.DeviceCount, &user.IPAddress, &user.UserAgent, &user.Platform, &user.Version)

	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	// Cache user data
	if r.cache.IsReady() {
		userData := &cache.UserCacheData{
			UserID:        user.UserID.String(),
			Username:      user.Username,
			Email:         user.Email,
			Avatar:        user.AvatarURL,
			Preferences:   user.Preferences,
			LastActive:    user.LastActive,
		}
		r.cache.CacheUserSession(ctx, userData)
	}

	log.Printf("👤 User retrieved: %s", user.UserID)
	return &user, nil
}

// UpdateUser updates user data
func (r *ScyllaDBRepository) UpdateUser(ctx context.Context, user *User) error {
	user.UpdatedAt = time.Now()

	query := qb.Update("users").
		Set("username", user.Username).
		Set("email", user.Email).
		Set("phone", user.Phone).
		Set("avatar_url", user.AvatarURL).
		Set("bio", user.Bio).
		Set("full_name", user.FullName).
		Set("date_of_birth", user.DateOfBirth).
		Set("gender", user.Gender).
		Set("location", user.Location).
		Set("website", user.Website).
		Set("is_verified", user.IsVerified).
		Set("is_active", user.IsActive).
		Set("is_premium", user.IsPremium).
		Set("language", user.Language).
		Set("timezone", user.Timezone).
		Set("preferences", user.Preferences).
		Set("privacy_settings", user.PrivacySettings).
		Set("notification_settings", user.NotificationSettings).
		Set("updated_at", user.UpdatedAt).
		Set("last_active", user.LastActive).
		Set("login_count", user.LoginCount).
		Set("device_count", user.DeviceCount).
		Where(qb.Eq("user_id", user.UserID)).
		ToCql()

	err := r.session.Queryctx(ctx, query).Exec()
	if err != nil {
		return fmt.Errorf("failed to update user: %w", err)
	}

	// Update cache
	if r.cache.IsReady() {
		userData := &cache.UserCacheData{
			UserID:        user.UserID.String(),
			Username:      user.Username,
			Email:         user.Email,
			Avatar:        user.AvatarURL,
			Preferences:   user.Preferences,
			LastActive:    user.LastActive,
		}
		r.cache.CacheUserSession(ctx, userData)
	}

	log.Printf("👤 User updated: %s", user.UserID)
	return nil
}

// DeleteUser deletes a user
func (r *ScyllaDBRepository) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	query := qb.Delete("users").
		Where(qb.Eq("user_id", userID)).
		ToCql()

	err := r.session.Queryctx(ctx, query).Exec()
	if err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}

	log.Printf("👤 User deleted: %s", userID)
	return nil
}

// ListUsers lists users with pagination and filtering
func (r *ScyllaDBRepository) ListUsers(ctx context.Context, filter *UserFilter) ([]*User, *Pagination, error) {
	// Build query
	builder := qb.Select("users").
		Columns("user_id", "username", "email", "phone", "avatar_url", "bio", "full_name",
			"date_of_birth", "gender", "location", "website", "is_verified", "is_active",
			"is_premium", "language", "timezone", "preferences", "privacy_settings",
			"notification_settings", "created_at", "updated_at", "last_active", "last_login",
			"login_count", "device_count", "ip_address", "user_agent", "platform", "version").
		Limit(uint64(filter.Limit)).
		Offset(uint64(filter.Offset))

	// Add filters
	if filter.Username != "" {
		builder = builder.Where(qb.Like("username", "%"+filter.Username+"%"))
	}
	if filter.Email != "" {
		builder = builder.Where(qb.Like("email", "%"+filter.Email+"%"))
	}
	if filter.IsActive != nil {
		builder = builder.Where(qb.Eq("is_active", *filter.IsActive))
	}
	if filter.IsPremium != nil {
		builder = builder.Where(qb.Eq("is_premium", *filter.IsPremium))
	}
	if filter.IsVerified != nil {
		builder = builder.Where(qb.Eq("is_verified", *filter.IsVerified))
	}
	if filter.Location != "" {
		builder = builder.Where(qb.Like("location", "%"+filter.Location+"%"))
	}
	if filter.CreatedAfter != nil {
		builder = builder.Where(qb.Gt("created_at", *filter.CreatedAfter))
	}
	if filter.CreatedBefore != nil {
		builder = builder.Where(qb.Lt("created_at", *filter.CreatedBefore))
	}
	if filter.LastActiveAfter != nil {
		builder = builder.Where(qb.Gt("last_active", *filter.LastActiveAfter))
	}
	if filter.LastActiveBefore != nil {
		builder = builder.Where(qb.Lt("last_active", *filter.LastActiveBefore))
	}

	// Add sorting
	if filter.SortBy != "" {
		order := "ASC"
		if filter.SortOrder == "desc" {
			order = "DESC"
		}
		builder = builder.OrderBy(filter.SortBy, order)
	}

	query := builder.ToCql()

	// Execute query
	iter := r.session.Queryctx(ctx, query)
	defer iter.Close()

	var users []*User
	for iter.StructScan(&User{}) {
		var user User
		if err := iter.Get(&user); err == nil {
			users = append(users, &user)
		}
	}

	// Get total count for pagination
	countQuery := qb.Select("users").
		Count("user_id").
		ToCql()

	var total int64
	err := r.session.Queryctx(ctx, countQuery).Get(&total)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Calculate pagination
	page := (filter.Offset / filter.Limit) + 1
	totalPages := int((total + int64(filter.Limit) - 1) / int64(filter.Limit))
	hasNext := page < totalPages
	hasPrev := page > 1

	pagination := &Pagination{
		Page:       page,
		Limit:      filter.Limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    hasNext,
		HasPrev:    hasPrev,
	}

	log.Printf("👤 Users listed: %d, page: %d", len(users), page)
	return users, pagination, nil
}

// ========================================
// VIDEO OPERATIONS
// ========================================

// CreateVideo creates a new video
func (r *ScyllaDBRepository) CreateVideo(ctx context.Context, video *Video) error {
	query := qb.Insert("videos").
		Columns("video_id", "user_id", "title", "description", "thumbnail_url", "video_url",
			"duration", "file_size", "format", "resolution", "quality", "category", "tags",
			"language", "subtitles", "age_rating", "content_rating", "is_public", "is_premium",
			"is_featured", "is_trending", "allow_comments", "allow_downloads", "monetization",
			"license", "location", "recording_date", "upload_date", "published_date",
			"created_at", "updated_at").
		ToCql()

	err := r.session.Queryctx(ctx, query,
		video.VideoID, video.UserID, video.Title, video.Description, video.ThumbnailURL, video.VideoURL,
		video.Duration, video.FileSize, video.Format, video.Resolution, video.Quality, video.Category, video.Tags,
		video.Language, video.Subtitles, video.AgeRating, video.ContentRating, video.IsPublic, video.IsPremium,
		video.IsFeatured, video.IsTrending, video.AllowComments, video.AllowDownloads, video.Monetization,
		video.License, video.Location, video.RecordingDate, video.UploadDate, video.PublishedDate,
		video.CreatedAt, video.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create video: %w", err)
	}

	// Create video stats
	stats := NewVideoStats()
	stats.VideoID = video.VideoID
	err = r.CreateVideoStats(ctx, stats)
	if err != nil {
		log.Printf("Failed to create video stats: %v", err)
	}

	// Cache video data
	if r.cache.IsReady() {
		videoData := &cache.VideoCacheData{
			VideoID:      video.VideoID.String(),
			Title:        video.Title,
			Description:  video.Description,
			ThumbnailURL: video.ThumbnailURL,
			VideoURL:     video.VideoURL,
			Duration:     video.Duration,
			ViewCount:    0,
			LikeCount:    0,
			Quality:      video.Quality,
			Tags:         video.Tags,
			Category:     video.Category,
			CreatedAt:    video.CreatedAt,
			UpdatedAt:    video.UpdatedAt,
		}
		r.cache.CacheVideoData(ctx, videoData)
	}

	log.Printf("🎬 Video created: %s", video.VideoID)
	return nil
}

// GetVideoByID retrieves video by ID
func (r *ScyllaDBRepository) GetVideoByID(ctx context.Context, videoID uuid.UUID) (*Video, error) {
	// Try cache first
	if r.cache.IsReady() {
		videoData, err := r.cache.GetVideoData(ctx, videoID.String())
		if err == nil {
			video := &Video{
				VideoID:      uuid.MustParse(videoData.VideoID),
				Title:        videoData.Title,
				Description:  videoData.Description,
				ThumbnailURL: videoData.ThumbnailURL,
				VideoURL:     videoData.VideoURL,
				Duration:     videoData.Duration,
				Quality:      videoData.Quality,
				Tags:         videoData.Tags,
				Category:     videoData.Category,
				CreatedAt:    videoData.CreatedAt,
				UpdatedAt:    videoData.UpdatedAt,
			}
			return video, nil
		}
	}

	// Query database
	query := qb.Select("videos").
		Columns("video_id", "user_id", "title", "description", "thumbnail_url", "video_url",
			"duration", "file_size", "format", "resolution", "quality", "category", "tags",
			"language", "subtitles", "age_rating", "content_rating", "is_public", "is_premium",
			"is_featured", "is_trending", "allow_comments", "allow_downloads", "monetization",
			"license", "location", "recording_date", "upload_date", "published_date",
			"created_at", "updated_at").
		Where(qb.Eq("video_id", videoID)).
		ToCql()

	var video Video
	err := r.session.Queryctx(ctx, query, videoID).Get(
		&video.VideoID, &video.UserID, &video.Title, &video.Description, &video.ThumbnailURL, &video.VideoURL,
		&video.Duration, &video.FileSize, &video.Format, &video.Resolution, &video.Quality, &video.Category, &video.Tags,
		&video.Language, &video.Subtitles, &video.AgeRating, &video.ContentRating, &video.IsPublic, &video.IsPremium,
		&video.IsFeatured, &video.IsTrending, &video.AllowComments, &video.AllowDownloads, &video.Monetization,
		&video.License, &video.Location, &video.RecordingDate, &video.UploadDate, &video.PublishedDate,
		&video.CreatedAt, &video.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to get video: %w", err)
	}

	// Cache video data
	if r.cache.IsReady() {
		videoData := &cache.VideoCacheData{
			VideoID:      video.VideoID.String(),
			Title:        video.Title,
			Description:  video.Description,
			ThumbnailURL: video.ThumbnailURL,
			VideoURL:     video.VideoURL,
			Duration:     video.Duration,
			ViewCount:    0,
			LikeCount:    0,
			Quality:      video.Quality,
			Tags:         video.Tags,
			Category:     video.Category,
			CreatedAt:    video.CreatedAt,
			UpdatedAt:    video.UpdatedAt,
		}
		r.cache.CacheVideoData(ctx, videoData)
	}

	log.Printf("🎬 Video retrieved: %s", video.VideoID)
	return &video, nil
}

// UpdateVideo updates video data
func (r *ScyllaDBRepository) UpdateVideo(ctx context.Context, video *Video) error {
	video.UpdatedAt = time.Now()

	query := qb.Update("videos").
		Set("title", video.Title).
		Set("description", video.Description).
		Set("thumbnail_url", video.ThumbnailURL).
		Set("video_url", video.VideoURL).
		Set("duration", video.Duration).
		Set("file_size", video.FileSize).
		Set("format", video.Format).
		Set("resolution", video.Resolution).
		Set("quality", video.Quality).
		Set("category", video.Category).
		Set("tags", video.Tags).
		Set("language", video.Language).
		Set("subtitles", video.Subtitles).
		Set("age_rating", video.AgeRating).
		Set("content_rating", video.ContentRating).
		Set("is_public", video.IsPublic).
		Set("is_premium", video.IsPremium).
		Set("is_featured", video.IsFeatured).
		Set("is_trending", video.IsTrending).
		Set("allow_comments", video.AllowComments).
		Set("allow_downloads", video.AllowDownloads).
		Set("monetization", video.Monetization).
		Set("license", video.License).
		Set("location", video.Location).
		Set("recording_date", video.RecordingDate).
		Set("upload_date", video.UploadDate).
		Set("published_date", video.PublishedDate).
		Set("updated_at", video.UpdatedAt).
		Where(qb.Eq("video_id", video.VideoID)).
		ToCql()

	err := r.session.Queryctx(ctx, query).Exec()
	if err != nil {
		return fmt.Errorf("failed to update video: %w", err)
	}

	// Update cache
	if r.cache.IsReady() {
		videoData := &cache.VideoCacheData{
			VideoID:      video.VideoID.String(),
			Title:        video.Title,
			Description:  video.Description,
			ThumbnailURL: video.ThumbnailURL,
			VideoURL:     video.VideoURL,
			Duration:     video.Duration,
			ViewCount:    0,
			LikeCount:    0,
			Quality:      video.Quality,
			Tags:         video.Tags,
			Category:     video.Category,
			CreatedAt:    video.CreatedAt,
			UpdatedAt:    video.UpdatedAt,
		}
		r.cache.CacheVideoData(ctx, videoData)
	}

	log.Printf("🎬 Video updated: %s", video.VideoID)
	return nil
}

// DeleteVideo deletes a video
func (r *ScyllaDBRepository) DeleteVideo(ctx context.Context, videoID uuid.UUID) error {
	query := qb.Delete("videos").
		Where(qb.Eq("video_id", videoID)).
		ToCql()

	err := r.session.Queryctx(ctx, query).Exec()
	if err != nil {
		return fmt.Errorf("failed to delete video: %w", err)
	}

	// Delete video stats
	err = r.DeleteVideoStats(ctx, videoID)
	if err != nil {
		log.Printf("Failed to delete video stats: %v", err)
	}

	log.Printf("🎬 Video deleted: %s", videoID)
	return nil
}

// ListVideos lists videos with pagination and filtering
func (r *ScyllaDBRepository) ListVideos(ctx context.Context, filter *VideoFilter) ([]*Video, *Pagination, error) {
	// Build query
	builder := qb.Select("videos").
		Columns("video_id", "user_id", "title", "description", "thumbnail_url", "video_url",
			"duration", "file_size", "format", "resolution", "quality", "category", "tags",
			"language", "subtitles", "age_rating", "content_rating", "is_public", "is_premium",
			"is_featured", "is_trending", "allow_comments", "allow_downloads", "monetization",
			"license", "location", "recording_date", "upload_date", "published_date",
			"created_at", "updated_at").
		Limit(uint64(filter.Limit)).
		Offset(uint64(filter.Offset))

	// Add filters
	if filter.UserID != uuid.Nil {
		builder = builder.Where(qb.Eq("user_id", filter.UserID))
	}
	if filter.Title != "" {
		builder = builder.Where(qb.Like("title", "%"+filter.Title+"%"))
	}
	if filter.Description != "" {
		builder = builder.Where(qb.Like("description", "%"+filter.Description+"%"))
	}
	if filter.Category != "" {
		builder = builder.Where(qb.Eq("category", filter.Category))
	}
	if len(filter.Tags) > 0 {
		builder = builder.Where(qb.In("tags", filter.Tags))
	}
	if filter.Language != "" {
		builder = builder.Where(qb.Eq("language", filter.Language))
	}
	if filter.IsPublic != nil {
		builder = builder.Where(qb.Eq("is_public", *filter.IsPublic))
	}
	if filter.IsPremium != nil {
		builder = builder.Where(qb.Eq("is_premium", *filter.IsPremium))
	}
	if filter.IsFeatured != nil {
		builder = builder.Where(qb.Eq("is_featured", *filter.IsFeatured))
	}
	if filter.IsTrending != nil {
		builder = builder.Where(qb.Eq("is_trending", *filter.IsTrending))
	}
	if filter.CreatedAfter != nil {
		builder = builder.Where(qb.Gt("created_at", *filter.CreatedAfter))
	}
	if filter.CreatedBefore != nil {
		builder = builder.Where(qb.Lt("created_at", *filter.CreatedBefore))
	}
	if filter.PublishedAfter != nil {
		builder = builder.Where(qb.Gt("published_date", *filter.PublishedAfter))
	}
	if filter.PublishedBefore != nil {
		builder = builder.Where(qb.Lt("published_date", *filter.PublishedBefore))
	}
	if filter.DurationMin != nil {
		builder = builder.Where(qb.Gte("duration", *filter.DurationMin))
	}
	if filter.DurationMax != nil {
		builder = builder.Where(qb.Lte("duration", *filter.DurationMax))
	}

	// Add sorting
	if filter.SortBy != "" {
		order := "ASC"
		if filter.SortOrder == "desc" {
			order = "DESC"
		}
		builder = builder.OrderBy(filter.SortBy, order)
	}

	query := builder.ToCql()

	// Execute query
	iter := r.session.Queryctx(ctx, query)
	defer iter.Close()

	var videos []*Video
	for iter.StructScan(&Video{}) {
		var video Video
		if err := iter.Get(&video); err == nil {
			videos = append(videos, &video)
		}
	}

	// Get total count for pagination
	countQuery := qb.Select("videos").
		Count("video_id").
		ToCql()

	var total int64
	err := r.session.Queryctx(ctx, countQuery).Get(&total)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get total count: %w", err)
	}

	// Calculate pagination
	page := (filter.Offset / filter.Limit) + 1
	totalPages := int((total + int64(filter.Limit) - 1) / int64(filter.Limit))
	hasNext := page < totalPages
	hasPrev := page > 1

	pagination := &Pagination{
		Page:       page,
		Limit:      filter.Limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    hasNext,
		HasPrev:    hasPrev,
	}

	log.Printf("🎬 Videos listed: %d, page: %d", len(videos), page)
	return videos, pagination, nil
}

// ========================================
// VIDEO STATS OPERATIONS
// ========================================

// CreateVideoStats creates video stats
func (r *ScyllaDBRepository) CreateVideoStats(ctx context.Context, stats *VideoStats) error {
	query := qb.Insert("video_stats").
		Columns("video_id", "views_count", "unique_views", "likes_count", "dislikes_count",
			"comments_count", "shares_count", "downloads_count", "watch_time", "avg_watch_time",
			"retention_rate", "engagement_rate", "click_through_rate", "bounce_rate",
			"conversion_rate", "revenue", "cost", "profit", "rank", "score", "trending_score",
			"quality_score", "performance_score", "created_at", "updated_at").
		ToCql()

	err := r.session.Queryctx(ctx, query,
		stats.VideoID, stats.ViewsCount, stats.UniqueViews, stats.LikesCount, stats.DislikesCount,
		stats.CommentsCount, stats.SharesCount, stats.DownloadsCount, stats.WatchTime, stats.AvgWatchTime,
		stats.RetentionRate, stats.EngagementRate, stats.ClickThroughRate, stats.BounceRate,
		stats.ConversionRate, stats.Revenue, stats.Cost, stats.Profit, stats.Rank, stats.Score, stats.TrendingScore,
		stats.QualityScore, stats.PerformanceScore, stats.CreatedAt, stats.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create video stats: %w", err)
	}

	log.Printf("📊 Video stats created: %s", stats.VideoID)
	return nil
}

// GetVideoStats retrieves video stats
func (r *ScyllaDBRepository) GetVideoStats(ctx context.Context, videoID uuid.UUID) (*VideoStats, error) {
	query := qb.Select("video_stats").
		Columns("video_id", "views_count", "unique_views", "likes_count", "dislikes_count",
			"comments_count", "shares_count", "downloads_count", "watch_time", "avg_watch_time",
			"retention_rate", "engagement_rate", "click_through_rate", "bounce_rate",
			"conversion_rate", "revenue", "cost", "profit", "rank", "score", "trending_score",
			"quality_score", "performance_score", "created_at", "updated_at").
		Where(qb.Eq("video_id", videoID)).
		ToCql()

	var stats VideoStats
	err := r.session.Queryctx(ctx, query, videoID).Get(
		&stats.VideoID, &stats.ViewsCount, &stats.UniqueViews, &stats.LikesCount, &stats.DislikesCount,
		&stats.CommentsCount, &stats.SharesCount, &stats.DownloadsCount, &stats.WatchTime, &stats.AvgWatchTime,
		&stats.RetentionRate, &stats.EngagementRate, &stats.ClickThroughRate, &stats.BounceRate,
		&stats.ConversionRate, &stats.Revenue, &stats.Cost, &stats.Profit, &stats.Rank, &stats.Score, &stats.TrendingScore,
		&stats.QualityScore, &stats.PerformanceScore, &stats.CreatedAt, &stats.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to get video stats: %w", err)
	}

	log.Printf("📊 Video stats retrieved: %s", stats.VideoID)
	return &stats, nil
}

// UpdateVideoStats updates video stats
func (r *ScyllaDBRepository) UpdateVideoStats(ctx context.Context, stats *VideoStats) error {
	stats.UpdatedAt = time.Now()

	query := qb.Update("video_stats").
		Set("views_count", stats.ViewsCount).
		Set("unique_views", stats.UniqueViews).
		Set("likes_count", stats.LikesCount).
		Set("dislikes_count", stats.DislikesCount).
		Set("comments_count", stats.CommentsCount).
		Set("shares_count", stats.SharesCount).
		Set("downloads_count", stats.DownloadsCount).
		Set("watch_time", stats.WatchTime).
		Set("avg_watch_time", stats.AvgWatchTime).
		Set("retention_rate", stats.RetentionRate).
		Set("engagement_rate", stats.EngagementRate).
		Set("click_through_rate", stats.ClickThroughRate).
		Set("bounce_rate", stats.BounceRate).
		Set("conversion_rate", stats.ConversionRate).
		Set("revenue", stats.Revenue).
		Set("cost", stats.Cost).
		Set("profit", stats.Profit).
		Set("rank", stats.Rank).
		Set("score", stats.Score).
		Set("trending_score", stats.TrendingScore).
		Set("quality_score", stats.QualityScore).
		Set("performance_score", stats.PerformanceScore).
		Set("updated_at", stats.UpdatedAt).
		Where(qb.Eq("video_id", stats.VideoID)).
		ToCql()

	err := r.session.Queryctx(ctx, query).Exec()
	if err != nil {
		return fmt.Errorf("failed to update video stats: %w", err)
	}

	// Update cache
	if r.cache.IsReady() {
		r.cache.UpdateVideoViewCount(ctx, stats.VideoID.String())
	}

	log.Printf("📊 Video stats updated: %s", stats.VideoID)
	return nil
}

// DeleteVideoStats deletes video stats
func (r *ScyllaDBRepository) DeleteVideoStats(ctx context.Context, videoID uuid.UUID) error {
	query := qb.Delete("video_stats").
		Where(qb.Eq("video_id", videoID)).
		ToCql()

	err := r.session.Queryctx(ctx, query).Exec()
	if err != nil {
		return fmt.Errorf("failed to delete video stats: %w", err)
	}

	log.Printf("📊 Video stats deleted: %s", videoID)
	return nil
}

// ========================================
// SOCIAL GRAPH OPERATIONS
// ========================================

// FollowUser creates a follow relationship
func (r *ScyllaDBRepository) FollowUser(ctx context.Context, followerID, followingID uuid.UUID) error {
	now := time.Now()

	// Create follower relationship
	followerQuery := qb.Insert("followers").
		Columns("follower_id", "following_id", "follow_date", "status", "created_at", "updated_at").
		ToCql()

	err := r.session.Queryctx(ctx, followerQuery, followerID, followingID, now, "active", now, now).Exec()
	if err != nil {
		return fmt.Errorf("failed to create follower relationship: %w", err)
	}

	// Create following relationship
	followingQuery := qb.Insert("following").
		Columns("user_id", "following_id", "follow_date", "status", "created_at", "updated_at").
		ToCql()

	err = r.session.Queryctx(ctx, followingQuery, followerID, followingID, now, "active", now, now).Exec()
	if err != nil {
		return fmt.Errorf("failed to create following relationship: %w", err)
	}

	// Update follower counts
	err = r.UpdateFollowerCounts(ctx, followerID, followingID, 1)
	if err != nil {
		log.Printf("Failed to update follower counts: %v", err)
	}

	log.Printf("👥 Follow relationship created: %s -> %s", followerID, followingID)
	return nil
}

// UnfollowUser removes a follow relationship
func (r *ScyllaDBRepository) UnfollowUser(ctx context.Context, followerID, followingID uuid.UUID) error {
	// Delete follower relationship
	followerQuery := qb.Delete("followers").
		Where(qb.Eq("follower_id", followerID), qb.Eq("following_id", followingID)).
		ToCql()

	err := r.session.Queryctx(ctx, followerQuery).Exec()
	if err != nil {
		return fmt.Errorf("failed to delete follower relationship: %w", err)
	}

	// Delete following relationship
	followingQuery := qb.Delete("following").
		Where(qb.Eq("user_id", followerID), qb.Eq("following_id", followingID)).
		ToCql()

	err = r.session.Queryctx(ctx, followingQuery).Exec()
	if err != nil {
		return fmt.Errorf("failed to delete following relationship: %w", err)
	}

	// Update follower counts
	err = r.UpdateFollowerCounts(ctx, followerID, followingID, -1)
	if err != nil {
		log.Printf("Failed to update follower counts: %v", err)
	}

	log.Printf("👥 Follow relationship removed: %s -> %s", followerID, followingID)
	return nil
}

// GetFollowers gets followers for a user
func (r *ScyllaDBRepository) GetFollowers(ctx context.Context, userID uuid.UUID, limit int) ([]*User, error) {
	query := qb.Select("followers").
		Columns("follower_id").
		Where(qb.Eq("following_id", userID)).
		Limit(uint64(limit)).
		ToCql()

	iter := r.session.Queryctx(ctx, query)
	defer iter.Close()

	var followerIDs []uuid.UUID
	for iter.Scan() {
		var followerID uuid.UUID
		if err := iter.Get(&followerID); err == nil {
			followerIDs = append(followerIDs, followerID)
		}
	}

	// Get user details for each follower
	var followers []*User
	for _, followerID := range followerIDs {
		user, err := r.GetUserByID(ctx, followerID)
		if err == nil {
			followers = append(followers, user)
		}
	}

	log.Printf("👥 Followers retrieved: %d for user: %s", len(followers), userID)
	return followers, nil
}

// GetFollowing gets users that a user is following
func (r *ScyllaDBRepository) GetFollowing(ctx context.Context, userID uuid.UUID, limit int) ([]*User, error) {
	query := qb.Select("following").
		Columns("following_id").
		Where(qb.Eq("user_id", userID)).
		Limit(uint64(limit)).
		ToCql()

	iter := r.session.Queryctx(ctx, query)
	defer iter.Close()

	var followingIDs []uuid.UUID
	for iter.Scan() {
		var followingID uuid.UUID
		if err := iter.Get(&followingID); err == nil {
			followingIDs = append(followingIDs, followingID)
		}
	}

	// Get user details for each following
	var following []*User
	for _, followingID := range followingIDs {
		user, err := r.GetUserByID(ctx, followingID)
		if err == nil {
			following = append(following, user)
		}
	}

	log.Printf("👥 Following retrieved: %d for user: %s", len(following), userID)
	return following, nil
}

// IsFollowing checks if user is following another user
func (r *ScyllaDBRepository) IsFollowing(ctx context.Context, userID, targetID uuid.UUID) (bool, error) {
	query := qb.Select("following").
		Columns("following_id").
		Where(qb.Eq("user_id", userID), qb.Eq("following_id", targetID)).
		ToCql()

	var followingID uuid.UUID
	err := r.session.Queryctx(ctx, query).Get(&followingID)
	if err != nil {
		if err == gocql.ErrNotFound {
			return false, nil
		}
		return false, fmt.Errorf("failed to check following: %w", err)
	}

	return true, nil
}

// UpdateFollowerCounts updates follower counts
func (r *ScyllaDBRepository) UpdateFollowerCounts(ctx context.Context, followerID, followingID uuid.UUID, delta int) error {
	// Get current social profiles
	followerProfile, err := r.GetUserSocialProfile(ctx, followerID)
	if err != nil {
		return fmt.Errorf("failed to get follower social profile: %w", err)
	}

	followingProfile, err := r.GetUserSocialProfile(ctx, followingID)
	if err != nil {
		return fmt.Errorf("failed to get following social profile: %w", err)
	}

	// Update counts
	followerProfile.FollowingCount += int64(delta)
	followingProfile.FollowersCount += int64(delta)
	followerProfile.UpdatedAt = time.Now()
	followingProfile.UpdatedAt = time.Now()

	// Save updated profiles
	err = r.UpdateUserSocialProfile(ctx, followerProfile)
	if err != nil {
		return fmt.Errorf("failed to update follower social profile: %w", err)
	}

	err = r.UpdateUserSocialProfile(ctx, followingProfile)
	if err != nil {
		return fmt.Errorf("failed to update following social profile: %w", err)
	}

	return nil
}

// ========================================
// USER SOCIAL PROFILE OPERATIONS
// ========================================

// GetUserSocialProfile retrieves user social profile
func (r *ScyllaDBRepository) GetUserSocialProfile(ctx context.Context, userID uuid.UUID) (*UserSocialProfile, error) {
	query := qb.Select("user_social_profile").
		Columns("user_id", "followers_count", "following_count", "posts_count", "likes_count",
			"shares_count", "comments_count", "views_count", "engagement_rate", "reach",
			"impressions", "social_score", "verification_badges", "achievements", "rank",
			"level", "experience_points", "created_at", "updated_at").
		Where(qb.Eq("user_id", userID)).
		ToCql()

	var profile UserSocialProfile
	err := r.session.Queryctx(ctx, query, userID).Get(
		&profile.UserID, &profile.FollowersCount, &profile.FollowingCount, &profile.PostsCount, &profile.LikesCount,
		&profile.SharesCount, &profile.CommentsCount, &profile.ViewsCount, &profile.EngagementRate, &profile.Reach,
		&profile.Impressions, &profile.SocialScore, &profile.VerificationBadges, &profile.Achievements, &profile.Rank,
		&profile.Level, &profile.ExperiencePoints, &profile.CreatedAt, &profile.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to get user social profile: %w", err)
	}

	log.Printf("👥 User social profile retrieved: %s", profile.UserID)
	return &profile, nil
}

// UpdateUserSocialProfile updates user social profile
func (r *ScyllaDBRepository) UpdateUserSocialProfile(ctx context.Context, profile *UserSocialProfile) error {
	profile.UpdatedAt = time.Now()

	query := qb.Update("user_social_profile").
		Set("followers_count", profile.FollowersCount).
		Set("following_count", profile.FollowingCount).
		Set("posts_count", profile.PostsCount).
		Set("likes_count", profile.LikesCount).
		Set("shares_count", profile.SharesCount).
		Set("comments_count", profile.CommentsCount).
		Set("views_count", profile.ViewsCount).
		Set("engagement_rate", profile.EngagementRate).
		Set("reach", profile.Reach).
		Set("impressions", profile.Impressions).
		Set("social_score", profile.SocialScore).
		Set("verification_badges", profile.VerificationBadges).
		Set("achievements", profile.Achievements).
		Set("rank", profile.Rank).
		Set("level", profile.Level).
		Set("experience_points", profile.ExperiencePoints).
		Set("updated_at", profile.UpdatedAt).
		Where(qb.Eq("user_id", profile.UserID)).
		ToCql()

	err := r.session.Queryctx(ctx, query).Exec()
	if err != nil {
		return fmt.Errorf("failed to update user social profile: %w", err)
	}

	log.Printf("👥 User social profile updated: %s", profile.UserID)
	return nil
}

// ========================================
// BATCH OPERATIONS
// ========================================

// BatchCreateUsers creates multiple users in batch
func (r *ScyllaDBRepository) BatchCreateUsers(ctx context.Context, users []*User) error {
	if len(users) == 0 {
		return nil
	}

	batch := r.session.NewBatch(gocql.LoggedBatch)

	for _, user := range users {
		query := qb.Insert("users").
			Columns("user_id", "username", "email", "phone", "avatar_url", "bio", "full_name",
				"date_of_birth", "gender", "location", "website", "is_verified", "is_active",
				"is_premium", "language", "timezone", "preferences", "privacy_settings",
				"notification_settings", "created_at", "updated_at", "last_active", "last_login",
				"login_count", "device_count", "ip_address", "user_agent", "platform", "version").
			ToCql()

		batch.Query(query,
			user.UserID, user.Username, user.Email, user.Phone, user.AvatarURL, user.Bio, user.FullName,
			user.DateOfBirth, user.Gender, user.Location, user.Website, user.IsVerified, user.IsActive,
			user.IsPremium, user.Language, user.Timezone, user.Preferences, user.PrivacySettings,
			user.NotificationSettings, user.CreatedAt, user.UpdatedAt, user.LastActive, user.LastLogin,
			user.LoginCount, user.DeviceCount, user.IPAddress, user.UserAgent, user.Platform, user.Version)
	}

	err := r.session.ExecuteBatch(batch)
	if err != nil {
		return fmt.Errorf("failed to batch create users: %w", err)
	}

	log.Printf("👤 Batch created users: %d", len(users))
	return nil
}

// BatchCreateVideos creates multiple videos in batch
func (r *ScyllaDBRepository) BatchCreateVideos(ctx context.Context, videos []*Video) error {
	if len(videos) == 0 {
		return nil
	}

	batch := r.session.NewBatch(gocql.LoggedBatch)

	for _, video := range videos {
		query := qb.Insert("videos").
			Columns("video_id", "user_id", "title", "description", "thumbnail_url", "video_url",
				"duration", "file_size", "format", "resolution", "quality", "category", "tags",
				"language", "subtitles", "age_rating", "content_rating", "is_public", "is_premium",
				"is_featured", "is_trending", "allow_comments", "allow_downloads", "monetization",
				"license", "location", "recording_date", "upload_date", "published_date",
				"created_at", "updated_at").
			ToCql()

		batch.Query(query,
			video.VideoID, video.UserID, video.Title, video.Description, video.ThumbnailURL, video.VideoURL,
			video.Duration, video.FileSize, video.Format, video.Resolution, video.Quality, video.Category, video.Tags,
			video.Language, video.Subtitles, video.AgeRating, video.ContentRating, video.IsPublic, video.IsPremium,
			video.IsFeatured, video.IsTrending, video.AllowComments, video.AllowDownloads, video.Monetization,
			video.License, video.Location, video.RecordingDate, video.UploadDate, video.PublishedDate,
			video.CreatedAt, video.UpdatedAt)
	}

	err := r.session.ExecuteBatch(batch)
	if err != nil {
		return fmt.Errorf("failed to batch create videos: %w", err)
	}

	log.Printf("🎬 Batch created videos: %d", len(videos))
	return nil
}

// ========================================
// SEARCH OPERATIONS
// ========================================

// SearchUsers searches users by username or email
func (r *ScyllaDBRepository) SearchUsers(ctx context.Context, query string, limit int) ([]*User, error) {
	searchQuery := qb.Select("users").
		Columns("user_id", "username", "email", "avatar_url", "bio", "is_verified", "is_premium", "created_at").
		Where(qb.Or(
			qb.Like("username", "%"+query+"%"),
			qb.Like("email", "%"+query+"%"),
		)).
		Limit(uint64(limit)).
		ToCql()

	iter := r.session.Queryctx(ctx, searchQuery)
	defer iter.Close()

	var users []*User
	for iter.StructScan(&User{}) {
		var user User
		if err := iter.Get(&user); err == nil {
			users = append(users, &user)
		}
	}

	log.Printf("👥 Users searched: %d for query: %s", len(users), query)
	return users, nil
}

// SearchVideos searches videos by title or description
func (r *ScyllaDBRepository) SearchVideos(ctx context.Context, query string, limit int) ([]*Video, error) {
	searchQuery := qb.Select("videos").
		Columns("video_id", "user_id", "title", "description", "thumbnail_url", "duration", "category", "tags", "created_at").
		Where(qb.Or(
			qb.Like("title", "%"+query+"%"),
			qb.Like("description", "%"+query+"%"),
		)).
		Limit(uint64(limit)).
		ToCql()

	iter := r.session.Queryctx(ctx, searchQuery)
	defer iter.Close()

	var videos []*Video
	for iter.StructScan(&Video{}) {
		var video Video
		if err := iter.Get(&video); err == nil {
			videos = append(videos, &video)
		}
	}

	log.Printf("🎬 Videos searched: %d for query: %s", len(videos), query)
	return videos, nil
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

// GetTableStats gets table statistics
func (r *ScyllaDBRepository) GetTableStats(ctx context.Context, tableName string) (map[string]interface{}, error) {
	query := fmt.Sprintf("SELECT COUNT(*) as total_count FROM %s", tableName)

	var totalCount int64
	err := r.session.Queryctx(ctx, query).Get(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("failed to get table stats: %w", err)
	}

	stats := map[string]interface{}{
		"table_name":  tableName,
		"total_count": totalCount,
		"last_update": time.Now(),
	}

	return stats, nil
}

// HealthCheck performs health check
func (r *ScyllaDBRepository) HealthCheck(ctx context.Context) error {
	query := "SELECT now() FROM system.local"
	var now time.Time
	err := r.session.Queryctx(ctx, query).Get(&now)
	if err != nil {
		return fmt.Errorf("health check failed: %w", err)
	}

	log.Printf("🔌 ScyllaDB health check passed")
	return nil
}

// Close closes the repository
func (r *ScyllaDBRepository) Close() error {
	if r.session != nil {
		r.session.Close()
	}
	log.Println("🔌 ScyllaDB repository closed")
	return nil
}

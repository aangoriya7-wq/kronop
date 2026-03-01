package com.kronop.videohub;

import android.content.Context;
import android.view.Surface;
import android.view.TextureView;
import android.util.Log;
import android.net.Uri;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.MediaItem;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.source.MediaSource;
import com.google.android.exoplayer2.source.ProgressiveMediaSource;
import com.google.android.exoplayer2.source.hls.HlsMediaSource;
import com.google.android.exoplayer2.source.dash.DashMediaSource;
import com.google.android.exoplayer2.upstream.DefaultDataSource;
import com.google.android.exoplayer2.upstream.DataSource;
import com.google.android.exoplayer2.trackselection.DefaultTrackSelector;
import com.google.android.exoplayer2.trackselection.TrackSelector;
import com.google.android.exoplayer2.LoadControl;
import com.google.android.exoplayer2.DefaultLoadControl;
import com.google.android.exoplayer2.Format;
import com.google.android.exoplayer2.Tracks;
import com.google.android.exoplayer2.C;

/**
 * High-performance video player with ExoPlayer integration
 * Optimized for instant playback and hardware acceleration
 */
public class KronopVideoPlayer {
    
    private static final String TAG = "KronopVideoPlayer";
    
    private Context context;
    private ExoPlayer exoPlayer;
    private TextureView textureView;
    private long videoId;
    private String videoUrl;
    private boolean isInitialized = false;
    private boolean isPlaying = false;
    
    // Performance configuration
    private static final int MIN_BUFFER_MS = 2000;        // 2 seconds
    private static final int MAX_BUFFER_MS = 10000;        // 10 seconds
    private static final int BUFFER_FOR_PLAYBACK_MS = 1000; // 1 second
    private static final int BUFFER_FOR_PLAYBACK_AFTER_REBUFFER_MS = 2000; // 2 seconds
    
    public KronopVideoPlayer(Context context, ReadableMap config) {
        this.context = context;
        initializePlayer(config);
    }
    
    /**
     * Initialize ExoPlayer with optimal configuration for instant playback
     */
    private void initializePlayer(ReadableMap config) {
        try {
            // Create track selector with adaptive streaming
            TrackSelector trackSelector = new DefaultTrackSelector(context);
            
            // Create load control for instant start
            LoadControl loadControl = new DefaultLoadControl.Builder()
                .setBufferDurationsMs(
                    MIN_BUFFER_MS,
                    MAX_BUFFER_MS,
                    BUFFER_FOR_PLAYBACK_MS,
                    BUFFER_FOR_PLAYBACK_AFTER_REBUFFER_MS
                )
                .setTargetBufferBytes(DefaultLoadControl.DEFAULT_TARGET_BUFFER_BYTES)
                .setPrioritizeTimeOverSizeThresholds(true) // Prioritize instant start
                .build();
            
            // Create ExoPlayer instance
            exoPlayer = new ExoPlayer.Builder(context)
                .setTrackSelector(trackSelector)
                .setLoadControl(loadControl)
                .build();
            
            // Setup player listeners
            setupPlayerListeners();
            
            isInitialized = true;
            Log.d(TAG, "KronopVideoPlayer initialized successfully");
            
        } catch (Exception e) {
            Log.e(TAG, "Error initializing player", e);
        }
    }
    
    /**
     * Setup player event listeners
     */
    private void setupPlayerListeners() {
        exoPlayer.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                switch (playbackState) {
                    case Player.STATE_READY:
                        Log.d(TAG, "Player ready for playback");
                        break;
                    case Player.STATE_BUFFERING:
                        Log.d(TAG, "Player buffering");
                        break;
                    case Player.STATE_ENDED:
                        Log.d(TAG, "Playback ended");
                        break;
                    case Player.STATE_IDLE:
                        Log.d(TAG, "Player idle");
                        break;
                }
            }
            
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                KronopVideoPlayer.this.isPlaying = isPlaying;
                Log.d(TAG, "Playing state changed: " + isPlaying);
            }
            
            @Override
            public void onTracksChanged(Tracks tracks) {
                Log.d(TAG, "Tracks changed: " + tracks);
            }
        });
    }
    
    /**
     * Load video with instant start capability
     */
    public void loadVideo(String videoUrl, long videoId, ReadableMap options) {
        try {
            this.videoUrl = videoUrl;
            this.videoId = videoId;
            
            // Create media source based on URL type
            MediaSource mediaSource = createMediaSource(videoUrl);
            
            // Prepare player with media source
            exoPlayer.setMediaSource(mediaSource);
            exoPlayer.prepare();
            
            Log.d(TAG, "Video loaded: " + videoUrl + " (ID: " + videoId + ")");
            
        } catch (Exception e) {
            Log.e(TAG, "Error loading video", e);
        }
    }
    
    /**
     * Create media source based on URL type
     */
    private MediaSource createMediaSource(String videoUrl) {
        DataSource.Factory dataSourceFactory = new DefaultDataSource.Factory(context);
        
        Uri uri = Uri.parse(videoUrl);
        
        if (videoUrl.contains(".m3u8") || videoUrl.contains("playlist")) {
            // HLS stream
            return new HlsMediaSource.Factory(dataSourceFactory)
                .setAllowChunklessPreparation(true) // Instant start
                .createMediaSource(MediaItem.fromUri(uri));
        } else if (videoUrl.contains(".mpd") || videoUrl.contains("dash")) {
            // DASH stream
            return new DashMediaSource.Factory(dataSourceFactory)
                .setLoadErrorHandlingPolicy(
                    new com.google.android.exoplayer2.upstream.DefaultLoadErrorHandlingPolicy()
                )
                .createMediaSource(MediaItem.fromUri(uri));
        } else {
            // Progressive media (MP4, WebM, etc.)
            return new ProgressiveMediaSource.Factory(dataSourceFactory)
                .createMediaSource(MediaItem.fromUri(uri));
        }
    }
    
    /**
     * Start video playback
     */
    public void play() {
        if (isInitialized && exoPlayer != null) {
            exoPlayer.play();
            Log.d(TAG, "Playback started");
        }
    }
    
    /**
     * Pause video playback
     */
    public void pause() {
        if (isInitialized && exoPlayer != null) {
            exoPlayer.pause();
            Log.d(TAG, "Playback paused");
        }
    }
    
    /**
     * Seek to specific position (instant seek)
     */
    public void seekTo(long positionMs) {
        if (isInitialized && exoPlayer != null) {
            exoPlayer.seekTo(positionMs);
            Log.d(TAG, "Seeked to position: " + positionMs + "ms");
        }
    }
    
    /**
     * Set playback speed
     */
    public void setPlaybackSpeed(float speed) {
        if (isInitialized && exoPlayer != null) {
            PlaybackParameters parameters = new PlaybackParameters(speed, 1.0f);
            exoPlayer.setPlaybackParameters(parameters);
            Log.d(TAG, "Playback speed set to: " + speed);
        }
    }
    
    /**
     * Get current playback position
     */
    public long getCurrentPosition() {
        if (isInitialized && exoPlayer != null) {
            return exoPlayer.getCurrentPosition();
        }
        return 0;
    }
    
    /**
     * Get video duration
     */
    public long getDuration() {
        if (isInitialized && exoPlayer != null) {
            return exoPlayer.getDuration();
        }
        return 0;
    }
    
    /**
     * Get video information
     */
    public WritableMap getVideoInfo() {
        WritableMap info = Arguments.createMap();
        
        if (isInitialized && exoPlayer != null) {
            info.putString("url", videoUrl);
            info.putDouble("videoId", videoId);
            info.putDouble("duration", getDuration());
            info.putDouble("currentPosition", getCurrentPosition());
            info.putBoolean("isPlaying", isPlaying);
            info.putBoolean("isInitialized", isInitialized);
            
            // Get video format information
            Format videoFormat = exoPlayer.getVideoFormat();
            if (videoFormat != null) {
                info.putInt("width", videoFormat.width);
                info.putInt("height", videoFormat.height);
                info.putDouble("frameRate", videoFormat.frameRate);
                info.putInt("bitrate", videoFormat.bitrate);
                info.putString("mimeType", videoFormat.sampleMimeType);
            }
        }
        
        return info;
    }
    
    /**
     * Set surface for video rendering
     */
    public void setSurface(Surface surface) {
        if (isInitialized && exoPlayer != null) {
            exoPlayer.setVideoSurface(surface);
            Log.d(TAG, "Surface set for video rendering");
        }
    }
    
    /**
     * Set texture view for video rendering
     */
    public void setTextureView(TextureView textureView) {
        this.textureView = textureView;
        if (textureView != null) {
            textureView.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
                @Override
                public void onSurfaceTextureAvailable(android.graphics.SurfaceTexture surface, int width, int height) {
                    setSurface(new Surface(surface));
                }
                
                @Override
                public void onSurfaceTextureSizeChanged(android.graphics.SurfaceTexture surface, int width, int height) {
                    // Handle surface size change
                }
                
                @Override
                public boolean onSurfaceTextureDestroyed(android.graphics.SurfaceTexture surface) {
                    setSurface(null);
                    return true;
                }
                
                @Override
                public void onSurfaceTextureUpdated(android.graphics.SurfaceTexture surface) {
                    // Handle surface texture update
                }
            });
        }
    }
    
    /**
     * Release player resources
     */
    public void release() {
        if (exoPlayer != null) {
            exoPlayer.release();
            exoPlayer = null;
        }
        
        isInitialized = false;
        isPlaying = false;
        Log.d(TAG, "Player resources released");
    }
    
    /**
     * Check if player is currently playing
     */
    public boolean isPlaying() {
        return isPlaying;
    }
    
    /**
     * Check if player is initialized
     */
    public boolean isInitialized() {
        return isInitialized;
    }
    
    /**
     * Get video ID
     */
    public long getVideoId() {
        return videoId;
    }
    
    /**
     * Get video URL
     */
    public String getVideoUrl() {
        return videoUrl;
    }
}

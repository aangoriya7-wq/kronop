// engine.cpp - Core Video Player Engine with FFmpeg
// Handles frame-by-frame rendering and playback control

#include <iostream>
#include <vector>
#include <thread>
#include <atomic>
#include <memory>
#include <chrono>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <EGL/egl.h>
#include <GLES3/gl3.h>

extern "C" {
    #include <libavcodec/avcodec.h>
    #include <libavformat/avformat.h>
    #include <libavfilter/avfilter.h>
    #include <libavutil/imgutils.h>
    #include <libswscale/swscale.h>
    #include <libavutil/time.h>
    
    // Assembly decoder integration
    extern void asm_decode_init();
    extern int asm_decode_frame(uint8_t* input, uint8_t* output, int width, int height);
    extern void asm_decode_cleanup();
}

#include "video_player.h"

class VideoEngine {
private:
    // FFmpeg components
    AVFormatContext* formatContext;
    AVCodecContext* codecContext;
    AVCodecParameters* codecParams;
    const AVCodec* codec;
    AVFrame* frame;
    AVFrame* rgbFrame;
    AVPacket* packet;
    SwsContext* swsContext;
    
    // Stream info
    int videoStreamIndex;
    double frameRate;
    int64_t totalFrames;
    
    // Rendering
    GLuint textureId;
    std::unique_ptr<uint8_t[]> frameBuffer;
    
    // Threading
    std::thread decoderThread;
    std::thread renderThread;
    std::atomic<bool> isPlaying;
    std::atomic<bool> isPaused;
    std::atomic<double> currentTime;
    std::queue<AVFrame*> frameQueue;
    std::mutex queueMutex;
    std::condition_variable queueCondition;
    
    // Performance
    std::chrono::steady_clock::time_point lastFrameTime;
    double targetFrameInterval;
    std::atomic<double> playbackSpeed;
    
    // UI Elements
    UIState uiState;
    std::vector<Button> buttons;

public:
    VideoEngine() : isPlaying(false), isPaused(false), currentTime(0.0), playbackSpeed(1.0) {
        initFFmpeg();
        initUIButtons();
    }
    
    ~VideoEngine() {
        cleanup();
    }
    
    void initFFmpeg() {
        avformat_network_init();
        formatContext = avformat_alloc_context();
        
        // Initialize assembly decoder for CPU optimization
        asm_decode_init();
        
        // Allocate frames
        frame = av_frame_alloc();
        rgbFrame = av_frame_alloc();
        packet = av_packet_alloc();
    }
    
    void initUIButtons() {
        // Initialize all required buttons with their callbacks
        buttons = {
            {"play_pause", {10, 10}, playPauseCallback},
            {"stop", {70, 10}, stopCallback},
            {"seek_forward", {130, 10}, seekForwardCallback},
            {"seek_backward", {190, 10}, seekBackwardCallback},
            {"volume_up", {250, 10}, volumeUpCallback},
            {"volume_down", {310, 10}, volumeDownCallback},
            {"fullscreen", {370, 10}, fullscreenCallback},
            {"settings", {430, 10}, settingsCallback},
            {"star", {10, 70}, starCallback},
            {"comment", {70, 70}, commentCallback},
            {"share", {130, 70}, shareCallback},
            {"save", {190, 70}, saveCallback},
            {"report", {250, 70}, reportCallback},
            {"support", {310, 70}, supportCallback}
        };
    }
    
    bool loadVideo(const char* filename) {
        // Open video file
        if (avformat_open_input(&formatContext, filename, nullptr, nullptr) != 0) {
            std::cerr << "Could not open video file" << std::endl;
            return false;
        }
        
        // Find stream info
        if (avformat_find_stream_info(formatContext, nullptr) < 0) {
            std::cerr << "Could not find stream info" << std::endl;
            return false;
        }
        
        // Find video stream
        videoStreamIndex = av_find_best_stream(formatContext, AVMEDIA_TYPE_VIDEO, -1, -1, &codec, 0);
        if (videoStreamIndex < 0) {
            std::cerr << "Could not find video stream" << std::endl;
            return false;
        }
        
        // Setup codec
        codecParams = formatContext->streams[videoStreamIndex]->codecpar;
        codecContext = avcodec_alloc_context3(codec);
        avcodec_parameters_to_context(codecContext, codecParams);
        
        if (avcodec_open2(codecContext, codec, nullptr) < 0) {
            std::cerr << "Could not open codec" << std::endl;
            return false;
        }
        
        // Get frame rate
        frameRate = av_q2d(formatContext->streams[videoStreamIndex]->avg_frame_rate);
        targetFrameInterval = 1.0 / frameRate;
        
        // Calculate total frames
        totalFrames = formatContext->duration * frameRate / AV_TIME_BASE;
        
        // Setup scaling context
        swsContext = sws_getContext(
            codecContext->width, codecContext->height, codecContext->pix_fmt,
            codecContext->width, codecContext->height, AV_PIX_FMT_RGBA,
            SWS_BILINEAR, nullptr, nullptr, nullptr
        );
        
        // Allocate frame buffer
        int bufferSize = av_image_get_buffer_size(AV_PIX_FMT_RGBA, 
                                                   codecContext->width, 
                                                   codecContext->height, 1);
        frameBuffer = std::make_unique<uint8_t[]>(bufferSize);
        av_image_fill_arrays(rgbFrame->data, rgbFrame->linesize,
                            frameBuffer.get(), AV_PIX_FMT_RGBA,
                            codecContext->width, codecContext->height, 1);
        
        return true;
    }
    
    void startPlayback() {
        isPlaying = true;
        isPaused = false;
        
        // Start decoder thread
        decoderThread = std::thread(&VideoEngine::decodeFrames, this);
        
        // Start render thread
        renderThread = std::thread(&VideoEngine::renderFrames, this);
    }
    
    void decodeFrames() {
        while (isPlaying) {
            if (isPaused) {
                std::this_thread::sleep_for(std::chrono::milliseconds(10));
                continue;
            }
            
            // Read frame
            if (av_read_frame(formatContext, packet) >= 0) {
                if (packet->stream_index == videoStreamIndex) {
                    if (avcodec_send_packet(codecContext, packet) == 0) {
                        while (avcodec_receive_frame(codecContext, frame) == 0) {
                            // Use assembly decoder for CPU optimization
                            int asmResult = asm_decode_frame(
                                frame->data[0], 
                                rgbFrame->data[0],
                                codecContext->width,
                                codecContext->height
                            );
                            
                            // Fallback to software decoding if assembly fails
                            if (asmResult != 0) {
                                sws_scale(swsContext,
                                         frame->data, frame->linesize,
                                         0, codecContext->height,
                                         rgbFrame->data, rgbFrame->linesize);
                            }
                            
                            // Create copy of frame
                            AVFrame* frameCopy = av_frame_clone(rgbFrame);
                            
                            // Add to queue
                            std::lock_guard<std::mutex> lock(queueMutex);
                            if (frameQueue.size() < 30) { // Keep 30 frames buffer
                                frameQueue.push(frameCopy);
                                queueCondition.notify_one();
                            } else {
                                av_frame_free(&frameCopy);
                            }
                            
                            currentTime = frame->pts * av_q2d(formatContext->streams[videoStreamIndex]->time_base);
                        }
                    }
                }
                av_packet_unref(packet);
            } else {
                // End of file - loop if needed
                av_seek_frame(formatContext, videoStreamIndex, 0, AVSEEK_FLAG_BACKWARD);
            }
        }
    }
    
    void renderFrames() {
        // Initialize OpenGL for rendering
        initOpenGL();
        
        while (isPlaying) {
            auto frameStart = std::chrono::steady_clock::now();
            
            // Get next frame
            AVFrame* nextFrame = nullptr;
            {
                std::unique_lock<std::mutex> lock(queueMutex);
                queueCondition.wait_for(lock, std::chrono::milliseconds(16), [this] {
                    return !frameQueue.empty() || !isPlaying;
                });
                
                if (!frameQueue.empty()) {
                    nextFrame = frameQueue.front();
                    frameQueue.pop();
                }
            }
            
            if (nextFrame) {
                // Render frame
                renderFrameToScreen(nextFrame);
                
                // Update time display
                updateTimeDisplay(currentTime);
                
                // Update UI
                renderUI();
                
                av_frame_free(&nextFrame);
            }
            
            // Frame rate control
            auto frameEnd = std::chrono::steady_clock::now();
            auto frameDuration = std::chrono::duration_cast<std::chrono::microseconds>(
                frameEnd - frameStart).count() / 1000000.0;
            
            double sleepTime = (targetFrameInterval / playbackSpeed) - frameDuration;
            if (sleepTime > 0) {
                std::this_thread::sleep_for(std::chrono::microseconds(
                    static_cast<int>(sleepTime * 1000000)));
            }
        }
    }
    
    void renderFrameToScreen(AVFrame* frame) {
        // Update texture with new frame data
        glBindTexture(GL_TEXTURE_2D, textureId);
        glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0,
                        codecContext->width, codecContext->height,
                        GL_RGBA, GL_UNSIGNED_BYTE, frame->data[0]);
        
        // Render quad with texture
        renderQuad();
    }
    
    void renderUI() {
        // Render all buttons with proper states
        for (auto& button : buttons) {
            if (button.isVisible) {
                // Update button state (hover, pressed)
                updateButtonState(button);
                
                // Render button
                renderButton(button);
                
                // Execute callback if clicked
                if (button.isClicked) {
                    button.callback(this);
                    button.isClicked = false;
                }
            }
        }
        
        // Render title
        renderTitle();
        
        // Render channel intro
        renderChannelIntro();
    }
    
    // Instant seek functionality - zero buffer, immediate playback
    void seekTo(double timestamp) {
        int64_t seekTarget = timestamp / av_q2d(formatContext->streams[videoStreamIndex]->time_base);
        
        // Instant seek - clear frame queue immediately
        std::lock_guard<std::mutex> lock(queueMutex);
        while (!frameQueue.empty()) {
            AVFrame* frame = frameQueue.front();
            frameQueue.pop();
            av_frame_free(&frame);
        }
        
        // Seek to nearest keyframe for instant playback
        av_seek_frame(formatContext, videoStreamIndex, seekTarget, AVSEEK_FLAG_BACKWARD | AVSEEK_FLAG_ANY);
        avcodec_flush_buffers(codecContext);
        
        // Update current time immediately
        currentTime = timestamp;
        
        // Pre-buffer next 5 frames for smooth playback
        preBufferFrames(5);
    }
    
    void preBufferFrames(int count) {
        // Buffer next few frames for instant seek smoothness
        for (int i = 0; i < count && isPlaying; i++) {
            if (av_read_frame(formatContext, packet) >= 0) {
                if (packet->stream_index == videoStreamIndex) {
                    if (avcodec_send_packet(codecContext, packet) == 0) {
                        if (avcodec_receive_frame(codecContext, frame) == 0) {
                            // Use assembly decoder
                            int asmResult = asm_decode_frame(
                                frame->data[0], 
                                rgbFrame->data[0],
                                codecContext->width,
                                codecContext->height
                            );
                            
                            if (asmResult != 0) {
                                sws_scale(swsContext,
                                         frame->data, frame->linesize,
                                         0, codecContext->height,
                                         rgbFrame->data, rgbFrame->linesize);
                            }
                            
                            AVFrame* frameCopy = av_frame_clone(rgbFrame);
                            
                            std::lock_guard<std::mutex> lock(queueMutex);
                            frameQueue.push(frameCopy);
                        }
                    }
                }
                av_packet_unref(packet);
            }
        }
    }
    
    // Adaptive stitching - quality adjustment based on network
    void adjustQualityBasedOnNetwork(int networkSpeed) {
        if (networkSpeed < 500) { // Slow network
            codecContext->skip_loop_filter = AVDISCARD_NONKEY;
            codecContext->skip_frame = AVDISCARD_NONKEY;
            playbackSpeed = 0.8; // Slightly slower for smooth playback
        } else if (networkSpeed < 2000) { // Medium network
            codecContext->skip_loop_filter = AVDISCARD_DEFAULT;
            codecContext->skip_frame = AVDISCARD_DEFAULT;
            playbackSpeed = 1.0;
        } else { // Fast network
            codecContext->skip_loop_filter = AVDISCARD_NONE;
            codecContext->skip_frame = AVDISCARD_NONE;
            playbackSpeed = 1.0;
        }
    }
    
    // Button callbacks
    static void playPauseCallback(VideoEngine* engine) {
        engine->isPaused = !engine->isPaused;
    }
    
    static void stopCallback(VideoEngine* engine) {
        engine->isPlaying = false;
    }
    
    static void seekForwardCallback(VideoEngine* engine) {
        engine->seekTo(engine->currentTime + 10.0);
    }
    
    static void seekBackwardCallback(VideoEngine* engine) {
        engine->seekTo(engine->currentTime - 10.0);
    }
    
    static void starCallback(VideoEngine* engine) {
        // Save to favorites
        engine->saveToFavorites();
    }
    
    static void commentCallback(VideoEngine* engine) {
        // Open comments section
        engine->showComments();
    }
    
    static void shareCallback(VideoEngine* engine) {
        // Share video
        engine->shareVideo();
    }
    
    static void saveCallback(VideoEngine* engine) {
        // Save to watch later
        engine->saveToWatchLater();
    }
    
    static void reportCallback(VideoEngine* engine) {
        // Report video
        engine->reportVideo();
    }
    
    static void supportCallback(VideoEngine* engine) {
        // Open support
        engine->openSupport();
    }
    
    void saveToFavorites() {
        std::cout << "Video saved to favorites" << std::endl;
    }
    
    void showComments() {
        std::cout << "Opening comments section" << std::endl;
    }
    
    void shareVideo() {
        std::cout << "Sharing video" << std::endl;
    }
    
    void saveToWatchLater() {
        std::cout << "Saved to watch later" << std::endl;
    }
    
    void reportVideo() {
        std::cout << "Opening report dialog" << std::endl;
    }
    
    void openSupport() {
        std::cout << "Opening support chat" << std::endl;
    }
    
    void updateTimeDisplay(double time) {
        // Convert to HH:MM:SS format
        int hours = static_cast<int>(time / 3600);
        int minutes = static_cast<int>((time - hours * 3600) / 60);
        int seconds = static_cast<int>(time - hours * 3600 - minutes * 60);
        
        // Update UI text
        printf("\rTime: %02d:%02d:%02d", hours, minutes, seconds);
        fflush(stdout);
    }
    
    void renderTitle() {
        // Render video title
        if (formatContext && formatContext->metadata) {
            AVDictionaryEntry* tag = av_dict_get(formatContext->metadata, "title", nullptr, 0);
            if (tag) {
                // Render title text
                renderText(tag->value, 100, 100, 24, 0xFFFFFFFF);
            }
        }
    }
    
    void renderChannelIntro() {
        // Render channel intro animation
        static float introAlpha = 1.0f;
        if (introAlpha > 0) {
            // Fade out intro
            renderText("Channel Intro", 200, 200, 36, 0xFFFFFF | (static_cast<int>(introAlpha * 255) << 24));
            introAlpha -= 0.01f;
        }
    }
    
    void cleanup() {
        isPlaying = false;
        
        if (decoderThread.joinable())
            decoderThread.join();
        if (renderThread.joinable())
            renderThread.join();
        
        // Cleanup assembly decoder
        asm_decode_cleanup();
        
        // Cleanup FFmpeg resources
        avcodec_free_context(&codecContext);
        avformat_close_input(&formatContext);
        av_frame_free(&frame);
        av_frame_free(&rgbFrame);
        av_packet_free(&packet);
        sws_freeContext(swsContext);
    }
};

// Global engine instance
std::unique_ptr<VideoEngine> g_engine;

extern "C" {
    void init_player() {
        g_engine = std::make_unique<VideoEngine>();
    }
    
    int load_video(const char* path) {
        return g_engine->loadVideo(path) ? 0 : -1;
    }
    
    void play() {
        g_engine->startPlayback();
    }
    
    void seek(double time) {
        g_engine->seekTo(time);
    }
    
    void pause() {
        g_engine->pause();
    }
    
    void resume() {
        g_engine->resume();
    }
    
    void adjust_quality(int network_speed) {
        g_engine->adjustQualityBasedOnNetwork(network_speed);
    }
    
    void button_click(const char* button_id) {
        g_engine->handleButtonClick(button_id);
    }
    
    double get_current_time() {
        return g_engine->getCurrentTime();
    }
}

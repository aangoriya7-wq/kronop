; Video Player Header File
; Multi-language video player architecture
; Supports Assembly, C++, Rust, Go, Zig, Python, Kotlin, Swift

#ifndef VIDEO_PLAYER_H
#define VIDEO_PLAYER_H

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>
#include <stdbool.h>

// Video frame structure
typedef struct {
    uint8_t* data;
    int width;
    int height;
    int64_t timestamp;
    int64_t duration;
} VideoFrame;

// Player state
typedef enum {
    PLAYER_STATE_IDLE,
    PLAYER_STATE_LOADING,
    PLAYER_STATE_PLAYING,
    PLAYER_STATE_PAUSED,
    PLAYER_STATE_SEEKING,
    PLAYER_STATE_COMPLETED,
    PLAYER_STATE_ERROR
} PlayerState;

// Video quality levels
typedef enum {
    QUALITY_AUTO,
    QUALITY_240P,
    QUALITY_360P,
    QUALITY_480P,
    QUALITY_720P,
    QUALITY_1080P,
    QUALITY_4K
} VideoQuality;

// Button types
typedef enum {
    BUTTON_STAR,
    BUTTON_COMMENT,
    BUTTON_SHARE,
    BUTTON_SAVE,
    BUTTON_REPORT,
    BUTTON_SUPPORT,
    BUTTON_PLAY,
    BUTTON_PAUSE,
    BUTTON_SEEK_FORWARD,
    BUTTON_SEEK_BACKWARD,
    BUTTON_FULLSCREEN,
    BUTTON_QUALITY
} ButtonType;

// Network stats
typedef struct {
    uint64_t bandwidth;      // bytes per second
    uint32_t latency;        // milliseconds
    float packet_loss;        // percentage
    uint32_t buffer_health;   // seconds buffered
} NetworkStats;

// Memory stats
typedef struct {
    uint32_t used_mb;
    uint32_t total_mb;
    uint32_t cached_frames;
    uint32_t dropped_frames;
} MemoryStats;

// Core video player structure
typedef struct {
    void* decoder;           // Assembly decoder reference
    void* engine;            // C++ rendering engine
    void* memory_guard;       // Rust memory safety
    void* fetcher;          // Go network fetcher
    void* bridge;            // Zig language bridge
    void* ai_logic;          // Python AI logic
    void* wasm_core;         // WebAssembly core
    int width;
    int height;
    int fps;
    int is_playing;
} VideoPlayer;

// Function declarations
VideoPlayer* video_player_create();
int video_player_load(VideoPlayer* player, const char* url);
int video_player_play(VideoPlayer* player);
int video_player_pause(VideoPlayer* player);
int video_player_stop(VideoPlayer* player);
void video_player_destroy(VideoPlayer* player);

// Language-specific functions
void* init_asm_decoder();
void* init_cpp_engine();
void* init_rust_memory_guard();
void* init_go_fetcher();
void* init_zig_bridge();
void* init_python_ai();
void* init_wasm_core();

// ==================== C++ Engine Functions ====================
void* engine_create(void);
void engine_destroy(void* engine);
int engine_load_video(void* engine, const char* url);
void engine_play(void* engine);
void engine_pause(void* engine);
void engine_seek(void* engine, double seconds);
void engine_set_quality(void* engine, VideoQuality quality);
double engine_get_current_time(void* engine);
double engine_get_duration(void* engine);
void engine_get_frame(void* engine, VideoFrame* frame);

// ==================== Rust Memory Functions ====================
void* memory_guard_create(uint32_t max_mb);
void memory_guard_destroy(void* guard);
void* memory_allocate(void* guard, uint32_t size);
void memory_free(void* guard, void* ptr);
uint32_t memory_get_usage(void* guard);
bool memory_is_critical(void* guard);
void memory_collect_garbage(void* guard);

// ==================== Go Fetcher Functions ====================
void* fetcher_create(const char** urls, int url_count);
void fetcher_destroy(void* fetcher);
int fetcher_start(void* fetcher, const char* video_url);
void fetcher_cancel(void* fetcher);
int fetcher_get_progress(void* fetcher, uint64_t* downloaded, uint64_t* total);
int fetcher_get_chunk(void* fetcher, int chunk_index, uint8_t* buffer);
void fetcher_set_bandwidth_limit(void* fetcher, uint64_t limit);

// ==================== Zig Bridge Functions ====================
void* bridge_create(void);
void bridge_destroy(void* bridge);
void bridge_register_engine(void* bridge, void* engine);
void bridge_register_guard(void* bridge, void* guard);
void bridge_register_fetcher(void* bridge, void* fetcher);
void bridge_send_message(void* bridge, int msg_type, void* data);
void bridge_process_messages(void* bridge);

// ==================== Python AI Functions ====================
void* ai_create(void);
void ai_destroy(void* ai);
void ai_start(void* ai);
void ai_stop(void* ai);
void ai_update_network(void* ai, NetworkStats* stats);
int* ai_get_preload_list(void* ai, int* count);
void ai_set_playback_position(void* ai, double position);

// ==================== Kotlin UI Functions ====================
void* android_ui_create(void* env, void* context);
void android_ui_destroy(void* ui);
void android_ui_update_frame(void* ui, VideoFrame* frame);
void android_ui_button_click(void* ui, ButtonType button);
void android_ui_show_toast(void* ui, const char* message);

// ==================== Swift UI Functions ====================
void* ios_ui_create(void* view);
void ios_ui_destroy(void* ui);
void ios_ui_update_frame(void* ui, VideoFrame* frame);
void ios_ui_button_click(void* ui, ButtonType button);
void ios_ui_show_alert(void* ui, const char* title, const char* message);

// ==================== SQL Progress Functions ====================
void* db_create(const char* path);
void db_destroy(void* db);
int db_save_progress(void* db, uint64_t user_id, uint64_t video_id, uint64_t position);
int db_get_progress(void* db, uint64_t user_id, uint64_t video_id, uint64_t* position);
int db_save_bookmark(void* db, uint64_t user_id, uint64_t video_id, int type);
int db_get_bookmarks(void* db, uint64_t user_id, uint64_t video_id, uint64_t* video_ids, int* count);

// ==================== WebAssembly Functions ====================
void* wasm_create(void);
void wasm_destroy(void* wasm);
int wasm_decode_frame(void* wasm, int frame_num, uint8_t* buffer);
void wasm_render(void* wasm, uint8_t* buffer, int width, int height);
double wasm_get_current_time(void* wasm);

#ifdef __cplusplus
}
#endif

#endif // VIDEO_PLAYER_H

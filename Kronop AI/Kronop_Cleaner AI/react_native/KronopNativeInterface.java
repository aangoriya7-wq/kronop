package com.kronop;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.module.annotations.ReactModule;

import java.nio.ByteBuffer;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * KronopNativeInterface - React Native Bridge
 * High-performance video processing for mobile applications
 */
@ReactModule(name = KronopNativeInterface.NAME)
public class KronopNativeInterface extends ReactContextBaseJavaModule {
    
    public static final String NAME = "KronopNativeInterface";
    private static final String TAG = "KronopNative";
    
    // Native library loading
    static {
        try {
            System.loadLibrary("kronop_cleaner");
            Log.i(TAG, "Kronop Cleaner AI native library loaded successfully");
        } catch (UnsatisfiedLinkError e) {
            Log.e(TAG, "Failed to load native library: " + e.getMessage());
        }
    }
    
    // Thread pool for async processing
    private final ExecutorService processingExecutor = Executors.newFixedThreadPool(2);
    
    // Engine state
    private boolean isInitialized = false;
    private boolean vulkanEnabled = false;
    private int currentWidth = 0;
    private int currentHeight = 0;
    
    public KronopNativeInterface(ReactApplicationContext reactContext) {
        super(reactContext);
        Log.i(TAG, "KronopNativeInterface initialized");
    }
    
    @Override
    @NonNull
    public String getName() {
        return NAME;
    }
    
    /**
     * Initialize the Kronop Cleaner AI engine
     * @param width Video width (e.g., 1920 for 1080p)
     * @param height Video height (e.g., 1080 for 1080p)
     * @param enableVulkan Enable GPU acceleration (recommended for performance)
     * @param promise Promise for async result
     */
    @ReactMethod
    public void initialize(int width, int height, boolean enableVulkan, Promise promise) {
        if (isInitialized) {
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Already initialized");
            promise.resolve(result);
            return;
        }
        
        processingExecutor.execute(() -> {
            try {
                Log.i(TAG, String.format("Initializing Kronop Engine %dx%d, Vulkan: %s", 
                    width, height, enableVulkan ? "enabled" : "disabled"));
                
                boolean success = nativeInitialize(width, height, enableVulkan);
                
                if (success) {
                    isInitialized = true;
                    currentWidth = width;
                    currentHeight = height;
                    vulkanEnabled = nativeIsVulkanEnabled();
                    
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putString("message", "Kronop Cleaner AI initialized successfully");
                    result.putInt("width", width);
                    result.putInt("height", height);
                    result.putBoolean("vulkanEnabled", vulkanEnabled);
                    result.putString("performanceMode", vulkanEnabled ? "GPU" : "CPU");
                    
                    Log.i(TAG, String.format("Engine ready - Vulkan: %s, Mode: %s", 
                        vulkanEnabled, vulkanEnabled ? "GPU Accelerated" : "CPU Optimized"));
                    
                    promise.resolve(result);
                } else {
                    WritableMap error = Arguments.createMap();
                    error.putBoolean("success", false);
                    error.putString("message", "Failed to initialize Kronop Engine");
                    promise.reject("INIT_FAILED", "Engine initialization failed", error);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Initialization error: " + e.getMessage(), e);
                promise.reject("INIT_ERROR", "Initialization failed: " + e.getMessage());
            }
        });
    }
    
    /**
     * Process a single video frame
     * @param inputData Base64 encoded image data or raw byte array
     * @param width Frame width
     * @param height Frame height
     * @param promise Promise for processed frame
     */
    @ReactMethod
    public void processFrame(String inputData, int width, int height, Promise promise) {
        if (!isInitialized) {
            promise.reject("NOT_INITIALIZED", "Engine not initialized. Call initialize() first.");
            return;
        }
        
        processingExecutor.execute(() -> {
            try {
                long startTime = System.currentTimeMillis();
                
                // Convert input data to byte array
                byte[] inputBytes = decodeImageData(inputData);
                byte[] outputBytes = new byte[width * height * 3];
                
                Log.d(TAG, String.format("Processing frame %dx%d, data size: %d bytes", 
                    width, height, inputBytes.length));
                
                boolean success = nativeProcessFrame(inputBytes, outputBytes, width, height);
                
                if (success) {
                    long processingTime = System.currentTimeMillis() - startTime;
                    double fps = 1000.0 / processingTime;
                    
                    // Encode output data
                    String outputData = encodeImageData(outputBytes);
                    
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putString("outputData", outputData);
                    result.putInt("width", width);
                    result.putInt("height", height);
                    result.putDouble("processingTime", processingTime);
                    result.putDouble("fps", fps);
                    result.putString("mode", vulkanEnabled ? "GPU" : "CPU");
                    
                    Log.i(TAG, String.format("Frame processed in %d ms (%.1f FPS)", 
                        processingTime, fps));
                    
                    promise.resolve(result);
                } else {
                    promise.reject("PROCESSING_FAILED", "Frame processing failed");
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Frame processing error: " + e.getMessage(), e);
                promise.reject("PROCESSING_ERROR", "Frame processing failed: " + e.getMessage());
            }
        });
    }
    
    /**
     * Process multiple frames (batch processing)
     * @param framesData Array of frame data
     * @param width Frame width
     * @param height Frame height
     * @param frameCount Number of frames
     * @param promise Promise for batch results
     */
    @ReactMethod
    public void processBatch(ReadableArray framesData, int width, int height, int frameCount, Promise promise) {
        if (!isInitialized) {
            promise.reject("NOT_INITIALIZED", "Engine not initialized. Call initialize() first.");
            return;
        }
        
        processingExecutor.execute(() -> {
            try {
                long startTime = System.currentTimeMillis();
                
                // Convert frames to byte array
                byte[] inputBytes = convertFramesToByteArray(framesData, width, height, frameCount);
                byte[] outputBytes = new byte[width * height * 3 * frameCount];
                
                Log.i(TAG, String.format("Processing batch of %d frames (%dx%d)", 
                    frameCount, width, height));
                
                boolean success = nativeProcessBatch(inputBytes, outputBytes, width, height, frameCount);
                
                if (success) {
                    long processingTime = System.currentTimeMillis() - startTime;
                    double avgTimePerFrame = (double) processingTime / frameCount;
                    double avgFps = 1000.0 / avgTimePerFrame;
                    
                    // Convert output back to array
                    WritableMap result = Arguments.createMap();
                    result.putBoolean("success", true);
                    result.putString("outputData", encodeImageData(outputBytes));
                    result.putInt("frameCount", frameCount);
                    result.putDouble("totalProcessingTime", processingTime);
                    result.putDouble("avgTimePerFrame", avgTimePerFrame);
                    result.putDouble("avgFps", avgFps);
                    result.putString("mode", vulkanEnabled ? "GPU" : "CPU");
                    
                    Log.i(TAG, String.format("Batch completed in %d ms (%.1f FPS per frame)", 
                        processingTime, avgFps));
                    
                    promise.resolve(result);
                } else {
                    promise.reject("BATCH_FAILED", "Batch processing failed");
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Batch processing error: " + e.getMessage(), e);
                promise.reject("BATCH_ERROR", "Batch processing failed: " + e.getMessage());
            }
        });
    }
    
    /**
     * Set performance mode
     * @param mode 0=Quality, 1=Balanced, 2=Performance
     * @param promise Promise for result
     */
    @ReactMethod
    public void setPerformanceMode(int mode, Promise promise) {
        if (!isInitialized) {
            promise.reject("NOT_INITIALIZED", "Engine not initialized");
            return;
        }
        
        try {
            nativeSetPerformanceMode(mode);
            
            String modeName = getModeName(mode);
            Log.i(TAG, "Performance mode set to: " + modeName);
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("mode", modeName);
            result.putInt("modeValue", mode);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Performance mode error: " + e.getMessage(), e);
            promise.reject("MODE_ERROR", "Failed to set performance mode");
        }
    }
    
    /**
     * Get engine statistics and status
     * @param promise Promise for statistics
     */
    @ReactMethod
    public void getStatistics(Promise promise) {
        if (!isInitialized) {
            promise.reject("NOT_INITIALIZED", "Engine not initialized");
            return;
        }
        
        try {
            String stats = nativeGetStatistics();
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("statistics", stats);
            result.putInt("width", currentWidth);
            result.putInt("height", currentHeight);
            result.putBoolean("vulkanEnabled", vulkanEnabled);
            result.putString("mode", vulkanEnabled ? "GPU" : "CPU");
            result.putBoolean("initialized", isInitialized);
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Statistics error: " + e.getMessage(), e);
            promise.reject("STATS_ERROR", "Failed to get statistics");
        }
    }
    
    /**
     * Shutdown the engine and release resources
     * @param promise Promise for shutdown result
     */
    @ReactMethod
    public void shutdown(Promise promise) {
        if (!isInitialized) {
            promise.resolve("Already shutdown");
            return;
        }
        
        try {
            nativeShutdown();
            
            // Shutdown thread pool
            processingExecutor.shutdown();
            try {
                if (!processingExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                    processingExecutor.shutdownNow();
                }
            } catch (InterruptedException e) {
                processingExecutor.shutdownNow();
                Thread.currentThread().interrupt();
            }
            
            isInitialized = false;
            vulkanEnabled = false;
            currentWidth = 0;
            currentHeight = 0;
            
            Log.i(TAG, "Kronop Cleaner AI shutdown complete");
            
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            result.putString("message", "Engine shutdown successfully");
            
            promise.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Shutdown error: " + e.getMessage(), e);
            promise.reject("SHUTDOWN_ERROR", "Failed to shutdown engine");
        }
    }
    
    // Helper methods
    private byte[] decodeImageData(String inputData) {
        // Implementation for decoding Base64 or other format
        // For now, assume it's already in the right format
        return inputData.getBytes();
    }
    
    private String encodeImageData(byte[] data) {
        // Implementation for encoding to Base64 or other format
        return java.util.Base64.getEncoder().encodeToString(data);
    }
    
    private byte[] convertFramesToByteArray(ReadableArray frames, int width, int height, int frameCount) {
        // Convert React Native array to byte array
        ByteBuffer buffer = ByteBuffer.allocate(width * height * 3 * frameCount);
        
        for (int i = 0; i < frameCount && i < frames.size(); i++) {
            String frameData = frames.getString(i);
            byte[] frameBytes = decodeImageData(frameData);
            buffer.put(frameBytes);
        }
        
        return buffer.array();
    }
    
    private String getModeName(int mode) {
        switch (mode) {
            case 0: return "Quality";
            case 1: return "Balanced";
            case 2: return "Performance";
            default: return "Unknown";
        }
    }
    
    // Native method declarations
    private native boolean nativeInitialize(int width, int height, boolean enableVulkan);
    private native boolean nativeProcessFrame(byte[] input, byte[] output, int width, int height);
    private native boolean nativeProcessBatch(byte[] input, byte[] output, int width, int height, int frameCount);
    private native void nativeSetPerformanceMode(int mode);
    private native boolean nativeIsVulkanEnabled();
    private native String nativeGetStatistics();
    private native void nativeShutdown();
}

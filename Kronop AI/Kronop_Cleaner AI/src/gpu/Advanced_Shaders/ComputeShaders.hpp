/**
 * ComputeShaders.hpp
 * Complete Vulkan/OpenGL Compute Shader Implementation
 * Real-time GPU acceleration for maximum performance
 */

#ifndef COMPUTE_SHADERS_HPP
#define COMPUTE_SHADERS_HPP

#include <vector>
#include <memory>
#include <string>

#ifdef __ANDROID__
#include <GLES3/gl31.h>
#include <EGL/egl.h>
#else
#include <GL/glew.h>
#include <GL/gl.h>
#endif

namespace kronop {

/**
 * Shader Types for Different Processing Stages
 */
enum class ShaderType {
    FFT_FORWARD,        // Forward FFT computation
    FFT_INVERSE,        // Inverse FFT computation
    WIENER_FILTER,      // Wiener deconvolution filter
    SHARPENING,        // Smart sharpening filter
    MOTION_ESTIMATION,  // Optical flow computation
    COLOR_CORRECTION    // Color space and enhancement
};

/**
 * Compute Shader Configuration
 */
struct ShaderConfig {
    ShaderType type;
    int workgroupSizeX;
    int workgroupSizeY;
    int workgroupSizeZ;
    bool useSharedMemory;
    int sharedMemorySize;
    
    ShaderConfig(ShaderType t = ShaderType::WIENER_FILTER)
        : type(t), workgroupSizeX(16), workgroupSizeY(16), workgroupSizeZ(1),
          useSharedMemory(true), sharedMemorySize(1024) {}
};

/**
 * GPU Buffer Management
 */
class GPUBuffer {
public:
    GPUBuffer();
    ~GPUBuffer();
    
    bool create(size_t size, GLenum usage = GL_DYNAMIC_DRAW);
    void destroy();
    
    void* map(GLenum access = GL_WRITE_ONLY);
    void unmap();
    
    void bind(GLenum target);
    void unbind();
    
    void upload(const void* data, size_t size);
    void download(void* data, size_t size);
    
    size_t getSize() const { return size_; }
    GLuint getId() const { return bufferId_; }
    
private:
    GLuint bufferId_;
    size_t size_;
    void* mappedPtr_;
    bool isMapped_;
};

/**
 * Texture Management for Compute Shaders
 */
class ComputeTexture {
public:
    ComputeTexture();
    ~ComputeTexture();
    
    bool create(int width, int height, GLenum internalFormat);
    void destroy();
    
    void bindImage(int unit, GLenum access = GL_READ_WRITE);
    void unbindImage(int unit);
    
    void upload(const void* data, GLenum format, GLenum type);
    void download(void* data, GLenum format, GLenum type);
    
    int getWidth() const { return width_; }
    int getHeight() const { return height_; }
    GLuint getId() const { return textureId_; }
    
private:
    GLuint textureId_;
    int width_;
    int height_;
    GLenum internalFormat_;
};

/**
 * Advanced Compute Shader Manager
 */
class ComputeShaderManager {
public:
    explicit ComputeShaderManager();
    ~ComputeShaderManager();
    
    // Shader compilation and management
    bool compileShader(ShaderType type, const std::string& source);
    bool linkProgram();
    
    // Shader execution
    void dispatch(int workgroupsX, int workgroupsY, int workgroupsZ = 1);
    void memoryBarrier(GLbitfield barriers = GL_ALL_BARRIER_BITS);
    
    // Uniform management
    void setUniform(const std::string& name, int value);
    void setUniform(const std::string& name, float value);
    void setUniform(const std::string& name, const std::vector<float>& values);
    void setUniform(const std::string& name, const std::vector<int>& values);
    
    // Texture and buffer binding
    void bindImageTexture(int unit, ComputeTexture* texture, GLenum access);
    void bindSSBO(int unit, GPUBuffer* buffer);
    
    // Program management
    void useProgram();
    void unuseProgram();
    
    // Performance monitoring
    void beginTimer();
    double endTimer();
    double getLastExecutionTime() const;
    
    // Error checking
    bool checkCompileStatus(GLuint shader);
    bool checkLinkStatus(GLuint program);
    std::string getShaderLog(GLuint shader);
    std::string getProgramLog(GLuint program);

private:
    GLuint program_;
    std::vector<GLuint> shaders_;
    GLuint queryObject_;
    double lastExecutionTime_;
    
    // Shader source code generation
    std::string generateFFTShader(ShaderType type);
    std::string generateWienerShader();
    std::string generateSharpeningShader();
    std::string generateMotionShader();
    
    // Utility methods
    GLuint compileShaderSource(const std::string& source, GLenum shaderType);
    GLint getUniformLocation(const std::string& name);
};

/**
 * Complete GPU Processing Pipeline
 */
class GPUProcessingPipeline {
public:
    explicit GPUProcessingPipeline(int width, int height);
    ~GPUProcessingPipeline();
    
    // Pipeline initialization
    bool initialize();
    void shutdown();
    
    // Processing stages
    bool processFrame(const std::vector<float>& input,
                    std::vector<float>& output,
                    const std::vector<float>& psfKernel);
    
    // Individual stage processing
    void forwardFFT(const std::vector<float>& input, std::vector<float>& output);
    void wienerFilter(const std::vector<float>& input,
                     const std::vector<float>& psf,
                     std::vector<float>& output,
                     float noiseVariance, float snr);
    void inverseFFT(const std::vector<float>& input, std::vector<float>& output);
    void smartSharpening(const std::vector<float>& input,
                        std::vector<float>& output,
                        float strength, float radius);
    
    // Performance optimization
    void enableOptimizations(bool enable);
    void setWorkgroupSize(int x, int y, int z = 1);
    
    // Memory management
    void resize(int width, int height);
    size_t getMemoryUsage() const;
    
    // Performance metrics
    double getLastProcessingTime() const;
    double getAverageProcessingTime() const;
    void resetPerformanceMetrics();

private:
    int width_;
    int height_;
    bool initialized_;
    bool optimizationsEnabled_;
    
    // Shader manager
    std::unique_ptr<ComputeShaderManager> shaderManager_;
    
    // GPU resources
    std::unique_ptr<ComputeTexture> inputTexture_;
    std::unique_ptr<ComputeTexture> outputTexture_;
    std::unique_ptr<ComputeTexture> psfTexture_;
    std::unique_ptr<ComputeTexture> tempTexture_;
    
    std::unique_ptr<GPUBuffer> complexBuffer_;
    std::unique_ptr<GPUBuffer> psfBuffer_;
    std::unique_ptr<GPUBuffer> resultBuffer_;
    
    // Performance tracking
    double lastProcessingTime_;
    std::vector<double> processingTimes_;
    size_t maxHistorySize_;
    
    // Internal methods
    bool createTextures();
    bool createBuffers();
    void destroyTextures();
    void destroyBuffers();
    
    void updatePerformanceMetrics(double time);
};

/**
 * Shader Source Code Generator
 */
class ShaderGenerator {
public:
    // FFT shader generation
    static std::string generateForwardFFTShader(int workgroupSize);
    static std::string generateInverseFFTShader(int workgroupSize);
    
    // Wiener filter shader
    static std::string generateWienerFilterShader();
    
    // Smart sharpening shader
    static std::string generateSharpeningShader();
    
    // Motion estimation shader
    static std::string generateMotionEstimationShader();
    
    // Utility functions
    static std::string generateComplexMath();
    static std::string generateImageProcessing();
    static std::string generateOptimizationHints();

private:
    static std::string generateComplexOperations();
    static std::string generateFFTButterfly();
    static std::string generateRadixPermutation();
};

} // namespace kronop

#endif // COMPUTE_SHADERS_HPP

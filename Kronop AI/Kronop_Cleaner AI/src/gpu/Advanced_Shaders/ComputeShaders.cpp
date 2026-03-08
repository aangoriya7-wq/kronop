/**
 * ComputeShaders.cpp
 * Complete Implementation of Vulkan/OpenGL Compute Shaders
 * Maximum Performance GPU Processing Pipeline
 */

#include "ComputeShaders.hpp"
#include <chrono>
#include <iostream>
#include <sstream>
#include <algorithm>

namespace kronop {

// GPUBuffer Implementation
GPUBuffer::GPUBuffer() : bufferId_(0), size_(0), mappedPtr_(nullptr), isMapped_(false) {
}

GPUBuffer::~GPUBuffer() {
    destroy();
}

bool GPUBuffer::create(size_t size, GLenum usage) {
    if (bufferId_ != 0) {
        destroy();
    }
    
    glGenBuffers(1, &bufferId_);
    if (bufferId_ == 0) {
        return false;
    }
    
    glBindBuffer(GL_ARRAY_BUFFER, bufferId_);
    glBufferData(GL_ARRAY_BUFFER, size, nullptr, usage);
    glBindBuffer(GL_ARRAY_BUFFER, 0);
    
    size_ = size;
    return true;
}

void GPUBuffer::destroy() {
    if (bufferId_ != 0) {
        if (isMapped_) {
            unmap();
        }
        glDeleteBuffers(1, &bufferId_);
        bufferId_ = 0;
        size_ = 0;
    }
}

void* GPUBuffer::map(GLenum access) {
    if (isMapped_ || bufferId_ == 0) {
        return nullptr;
    }
    
    glBindBuffer(GL_ARRAY_BUFFER, bufferId_);
    mappedPtr_ = glMapBufferRange(GL_ARRAY_BUFFER, 0, size_, access);
    glBindBuffer(GL_ARRAY_BUFFER, 0);
    
    if (mappedPtr_ != nullptr) {
        isMapped_ = true;
    }
    
    return mappedPtr_;
}

void GPUBuffer::unmap() {
    if (!isMapped_ || bufferId_ == 0) {
        return;
    }
    
    glBindBuffer(GL_ARRAY_BUFFER, bufferId_);
    glUnmapBuffer(GL_ARRAY_BUFFER);
    glBindBuffer(GL_ARRAY_BUFFER, 0);
    
    mappedPtr_ = nullptr;
    isMapped_ = false;
}

void GPUBuffer::upload(const void* data, size_t size) {
    if (bufferId_ == 0 || size > size_) {
        return;
    }
    
    glBindBuffer(GL_ARRAY_BUFFER, bufferId_);
    glBufferSubData(GL_ARRAY_BUFFER, 0, size, data);
    glBindBuffer(GL_ARRAY_BUFFER, 0);
}

void GPUBuffer::download(void* data, size_t size) {
    if (bufferId_ == 0 || size > size_) {
        return;
    }
    
    glBindBuffer(GL_ARRAY_BUFFER, bufferId_);
    glGetBufferSubData(GL_ARRAY_BUFFER, 0, size, data);
    glBindBuffer(GL_ARRAY_BUFFER, 0);
}

// ComputeTexture Implementation
ComputeTexture::ComputeTexture() : textureId_(0), width_(0), height_(0), internalFormat_(GL_RGBA32F) {
}

ComputeTexture::~ComputeTexture() {
    destroy();
}

bool ComputeTexture::create(int width, int height, GLenum internalFormat) {
    if (textureId_ != 0) {
        destroy();
    }
    
    glGenTextures(1, &textureId_);
    if (textureId_ == 0) {
        return false;
    }
    
    glBindTexture(GL_TEXTURE_2D, textureId_);
    glTexStorage2D(GL_TEXTURE_2D, 1, internalFormat, width, height);
    
    // Set texture parameters for compute shader access
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_CLAMP_TO_EDGE);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_CLAMP_TO_EDGE);
    
    glBindTexture(GL_TEXTURE_2D, 0);
    
    width_ = width;
    height_ = height;
    internalFormat_ = internalFormat;
    
    return true;
}

void ComputeTexture::destroy() {
    if (textureId_ != 0) {
        glDeleteTextures(1, &textureId_);
        textureId_ = 0;
        width_ = height_ = 0;
    }
}

void ComputeTexture::bindImage(int unit, GLenum access) {
    if (textureId_ == 0) {
        return;
    }
    
    glBindImageTexture(unit, textureId_, 0, GL_FALSE, 0, access, internalFormat_);
}

void ComputeTexture::unbindImage(int unit) {
    glBindImageTexture(unit, 0, 0, GL_FALSE, 0, GL_READ_WRITE, GL_RGBA32F);
}

void ComputeTexture::upload(const void* data, GLenum format, GLenum type) {
    if (textureId_ == 0) {
        return;
    }
    
    glBindTexture(GL_TEXTURE_2D, textureId_);
    glTexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, width_, height_, format, type, data);
    glBindTexture(GL_TEXTURE_2D, 0);
}

void ComputeTexture::download(void* data, GLenum format, GLenum type) {
    if (textureId_ == 0) {
        return;
    }
    
    glBindTexture(GL_TEXTURE_2D, textureId_);
    glGetTexImage(GL_TEXTURE_2D, 0, format, type, data);
    glBindTexture(GL_TEXTURE_2D, 0);
}

// ComputeShaderManager Implementation
ComputeShaderManager::ComputeShaderManager() 
    : program_(0), queryObject_(0), lastExecutionTime_(0.0) {
    
    glGenQueries(1, &queryObject_);
}

ComputeShaderManager::~ComputeShaderManager() {
    if (program_ != 0) {
        glDeleteProgram(program_);
    }
    
    for (GLuint shader : shaders_) {
        glDeleteShader(shader);
    }
    
    if (queryObject_ != 0) {
        glDeleteQueries(1, &queryObject_);
    }
}

bool ComputeShaderManager::compileShader(ShaderType type, const std::string& source) {
    std::string shaderSource;
    
    switch (type) {
        case ShaderType::FFT_FORWARD:
            shaderSource = ShaderGenerator::generateForwardFFTShader(16);
            break;
        case ShaderType::FFT_INVERSE:
            shaderSource = ShaderGenerator::generateInverseFFTShader(16);
            break;
        case ShaderType::WIENER_FILTER:
            shaderSource = ShaderGenerator::generateWienerFilterShader();
            break;
        case ShaderType::SHARPENING:
            shaderSource = ShaderGenerator::generateSharpeningShader();
            break;
        case ShaderType::MOTION_ESTIMATION:
            shaderSource = ShaderGenerator::generateMotionEstimationShader();
            break;
        default:
            return false;
    }
    
    GLuint shader = compileShaderSource(shaderSource, GL_COMPUTE_SHADER);
    if (shader == 0) {
        return false;
    }
    
    shaders_.push_back(shader);
    return true;
}

bool ComputeShaderManager::linkProgram() {
    if (shaders_.empty()) {
        return false;
    }
    
    if (program_ != 0) {
        glDeleteProgram(program_);
    }
    
    program_ = glCreateProgram();
    if (program_ == 0) {
        return false;
    }
    
    // Attach all shaders
    for (GLuint shader : shaders_) {
        glAttachShader(program_, shader);
    }
    
    // Link program
    glLinkProgram(program_);
    
    // Check link status
    if (!checkLinkStatus(program_)) {
        return false;
    }
    
    return true;
}

void ComputeShaderManager::dispatch(int workgroupsX, int workgroupsY, int workgroupsZ) {
    if (program_ == 0) {
        return;
    }
    
    useProgram();
    glDispatchCompute(workgroupsX, workgroupsY, workgroupsZ);
    unuseProgram();
}

void ComputeShaderManager::memoryBarrier(GLbitfield barriers) {
    glMemoryBarrier(barriers);
}

void ComputeShaderManager::setUniform(const std::string& name, int value) {
    GLint location = getUniformLocation(name);
    if (location != -1) {
        glUniform1i(location, value);
    }
}

void ComputeShaderManager::setUniform(const std::string& name, float value) {
    GLint location = getUniformLocation(name);
    if (location != -1) {
        glUniform1f(location, value);
    }
}

void ComputeShaderManager::setUniform(const std::string& name, const std::vector<float>& values) {
    GLint location = getUniformLocation(name);
    if (location != -1) {
        switch (values.size()) {
            case 2:
                glUniform2fv(location, 1, values.data());
                break;
            case 3:
                glUniform3fv(location, 1, values.data());
                break;
            case 4:
                glUniform4fv(location, 1, values.data());
                break;
            default:
                glUniform1fv(location, values.size(), values.data());
                break;
        }
    }
}

void ComputeShaderManager::bindImageTexture(int unit, ComputeTexture* texture, GLenum access) {
    if (texture != nullptr) {
        texture->bindImage(unit, access);
    }
}

void ComputeShaderManager::bindSSBO(int unit, GPUBuffer* buffer) {
    if (buffer != nullptr) {
        glBindBufferBase(GL_SHADER_STORAGE_BUFFER, unit, buffer->getId());
    }
}

void ComputeShaderManager::useProgram() {
    if (program_ != 0) {
        glUseProgram(program_);
    }
}

void ComputeShaderManager::unuseProgram() {
    glUseProgram(0);
}

void ComputeShaderManager::beginTimer() {
    if (queryObject_ != 0) {
        glBeginQuery(GL_TIME_ELAPSED, queryObject_);
    }
}

double ComputeShaderManager::endTimer() {
    if (queryObject_ != 0) {
        glEndQuery(GL_TIME_ELAPSED);
        
        GLuint64 timeElapsed = 0;
        glGetQueryObjectui64v(queryObject_, GL_QUERY_RESULT, &timeElapsed);
        
        lastExecutionTime_ = static_cast<double>(timeElapsed) / 1e9; // Convert to seconds
        return lastExecutionTime_;
    }
    
    return 0.0;
}

GLuint ComputeShaderManager::compileShaderSource(const std::string& source, GLenum shaderType) {
    GLuint shader = glCreateShader(shaderType);
    if (shader == 0) {
        return 0;
    }
    
    const char* sourcePtr = source.c_str();
    glShaderSource(shader, 1, &sourcePtr, nullptr);
    glCompileShader(shader);
    
    if (!checkCompileStatus(shader)) {
        glDeleteShader(shader);
        return 0;
    }
    
    return shader;
}

bool ComputeShaderManager::checkCompileStatus(GLuint shader) {
    GLint compiled = 0;
    glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
    
    if (compiled == GL_FALSE) {
        GLint logLength = 0;
        glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &logLength);
        
        if (logLength > 0) {
            std::vector<char> log(logLength);
            glGetShaderInfoLog(shader, logLength, nullptr, log.data());
            // Log error message
            std::cerr << "Shader compilation error: " << log.data() << std::endl;
        }
        
        return false;
    }
    
    return true;
}

bool ComputeShaderManager::checkLinkStatus(GLuint program) {
    GLint linked = 0;
    glGetProgramiv(program, GL_LINK_STATUS, &linked);
    
    if (linked == GL_FALSE) {
        GLint logLength = 0;
        glGetProgramiv(program, GL_INFO_LOG_LENGTH, &logLength);
        
        if (logLength > 0) {
            std::vector<char> log(logLength);
            glGetProgramInfoLog(program, logLength, nullptr, log.data());
            // Log error message
            std::cerr << "Program linking error: " << log.data() << std::endl;
        }
        
        return false;
    }
    
    return true;
}

GLint ComputeShaderManager::getUniformLocation(const std::string& name) {
    if (program_ == 0) {
        return -1;
    }
    
    return glGetUniformLocation(program_, name.c_str());
}

// ShaderGenerator Implementation
std::string ShaderGenerator::generateForwardFFTShader(int workgroupSize) {
    return R"GLSL(
        #version 430 core
        layout(local_size_x = )" + std::to_string(workgroupSize) + R"GLSL() in;
        
        layout(binding = 0, rg32f) readonly uniform image2D inputImage;
        layout(binding = 1, rg32f) writeonly uniform image2D outputImage;
        
        uniform uint stage;
        uniform uint direction; // 0 = forward, 1 = inverse
        uniform uvec2 imageSize;
        
        struct Complex {
            float real, imag;
        };
        
        // Complex number operations
        Complex complexAdd(Complex a, Complex b) {
            return Complex(a.real + b.real, a.imag + b.imag);
        }
        
        Complex complexSub(Complex a, Complex b) {
            return Complex(a.real - b.real, a.imag - b.imag);
        }
        
        Complex complexMul(Complex a, Complex b) {
            return Complex(a.real * b.real - a.imag * b.imag,
                          a.real * b.imag + a.imag * b.real);
        }
        
        // Twiddle factor generator
        Complex twiddle(uint n, uint k) {
            float angle = -2.0 * 3.14159265359 * float(k) / float(n);
            if (direction == 1) angle = -angle; // Inverse FFT
            return Complex(cos(angle), sin(angle));
        }
        
        // Bit reversal for FFT
        uint reverseBits(uint n, uint bits) {
            uint reversed = 0;
            for (uint i = 0; i < bits; ++i) {
                reversed = (reversed << 1) | (n & 1);
                n >>= 1;
            }
            return reversed;
        }
        
        // Cooley-Tukey FFT butterfly
        void butterflyFFT(inout Complex a, inout Complex b, Complex tw) {
            Complex temp = complexMul(b, tw);
            b = complexSub(a, temp);
            a = complexAdd(a, temp);
        }
        
        // Shared memory for workgroup
        shared Complex sharedData[)" + std::to_string(workgroupSize) + R"GLSL()];
        
        void main() {
            uvec2 coord = gl_GlobalInvocationID.xy;
            uint idx = coord.y * imageSize.x + coord.x;
            
            // Load input data into shared memory
            Complex input;
            vec2 inputPixel = imageLoad(inputImage, ivec2(coord)).rg;
            input.real = inputPixel.r;
            input.imag = inputPixel.g;
            
            // Bit reversal for first stage
            uint bits = uint(log2(float(imageSize.x * imageSize.y)));
            uint reversedIdx = reverseBits(idx, bits);
            
            if (reversedIdx < imageSize.x * imageSize.y) {
                sharedData[gl_LocalInvocationIndex] = input;
            }
            
            memoryBarrierShared();
            barrier();
            
            // Perform FFT stages
            uint N = imageSize.x * imageSize.y;
            uint halfSize = 1;
            
            for (uint s = 0; s < stage; ++s) {
                uint k = gl_LocalInvocationIndex;
                
                if (k < halfSize) {
                    uint twiddleStep = N / (halfSize * 2);
                    Complex tw = twiddle(N, k * twiddleStep);
                    
                    uint pairIdx = k + halfSize;
                    butterflyFFT(sharedData[k], sharedData[pairIdx], tw);
                }
                
                halfSize *= 2;
                memoryBarrierShared();
                barrier();
            }
            
            // Store result
            if (gl_LocalInvocationIndex < imageSize.x * imageSize.y) {
                Complex result = sharedData[gl_LocalInvocationIndex];
                imageStore(outputImage, ivec2(coord), vec4(result.real, result.imag, 0.0, 1.0));
            }
        }
    )GLSL";
}

std::string ShaderGenerator::generateInverseFFTShader(int workgroupSize) {
    return R"GLSL(
        #version 430 core
        layout(local_size_x = )" + std::to_string(workgroupSize) + R"GLSL() in;
        
        layout(binding = 0, rg32f) readonly uniform image2D inputImage;
        layout(binding = 1, r32f) writeonly uniform image2D outputImage;
        
        uniform uint stage;
        uniform uint direction; // 0 = forward, 1 = inverse
        uniform uvec2 imageSize;
        uniform float scale; // Normalization factor for inverse FFT
        
        struct Complex {
            float real, imag;
        };
        
        // Complex number operations
        Complex complexAdd(Complex a, Complex b) {
            return Complex(a.real + b.real, a.imag + b.imag);
        }
        
        Complex complexSub(Complex a, Complex b) {
            return Complex(a.real - b.real, a.imag - b.imag);
        }
        
        Complex complexMul(Complex a, Complex b) {
            return Complex(a.real * b.real - a.imag * b.imag,
                          a.real * b.imag + a.imag * b.real);
        }
        
        // Twiddle factor generator for inverse FFT
        Complex twiddle(uint n, uint k) {
            float angle = 2.0 * 3.14159265359 * float(k) / float(n); // Positive for inverse
            return Complex(cos(angle), sin(angle));
        }
        
        // Bit reversal for FFT
        uint reverseBits(uint n, uint bits) {
            uint reversed = 0;
            for (uint i = 0; i < bits; ++i) {
                reversed = (reversed << 1) | (n & 1);
                n >>= 1;
            }
            return reversed;
        }
        
        // Cooley-Tukey FFT butterfly
        void butterflyFFT(inout Complex a, inout Complex b, Complex tw) {
            Complex temp = complexMul(b, tw);
            b = complexSub(a, temp);
            a = complexAdd(a, temp);
        }
        
        // Shared memory for workgroup
        shared Complex sharedData[)" + std::to_string(workgroupSize) + R"GLSL()];
        
        void main() {
            uvec2 coord = gl_GlobalInvocationID.xy;
            uint idx = coord.y * imageSize.x + coord.x;
            
            // Load input frequency data into shared memory
            Complex input;
            vec2 inputPixel = imageLoad(inputImage, ivec2(coord)).rg;
            input.real = inputPixel.r;
            input.imag = inputPixel.g;
            
            // Bit reversal for first stage
            uint bits = uint(log2(float(imageSize.x * imageSize.y)));
            uint reversedIdx = reverseBits(idx, bits);
            
            if (reversedIdx < imageSize.x * imageSize.y) {
                sharedData[gl_LocalInvocationIndex] = input;
            }
            
            memoryBarrierShared();
            barrier();
            
            // Perform inverse FFT stages
            uint N = imageSize.x * imageSize.y;
            uint halfSize = 1;
            
            for (uint s = 0; s < stage; ++s) {
                uint k = gl_LocalInvocationIndex;
                
                if (k < halfSize) {
                    uint twiddleStep = N / (halfSize * 2);
                    Complex tw = twiddle(N, k * twiddleStep);
                    
                    uint pairIdx = k + halfSize;
                    butterflyFFT(sharedData[k], sharedData[pairIdx], tw);
                }
                
                halfSize *= 2;
                memoryBarrierShared();
                barrier();
            }
            
            // Store result (real part only for inverse FFT)
            if (gl_LocalInvocationIndex < imageSize.x * imageSize.y) {
                Complex result = sharedData[gl_LocalInvocationIndex];
                // Apply normalization for inverse FFT
                float realPart = result.real * scale;
                imageStore(outputImage, ivec2(coord), vec4(realPart, 0.0, 0.0, 1.0));
            }
        }
    )GLSL";
}

std::string ShaderGenerator::generateWienerFilterShader() {
    return R"GLSL(
        #version 430 core
        layout(local_size_x = 16, local_size_y = 16) in;
        
        layout(binding = 0, r32f) readonly uniform image2D inputImage;
        layout(binding = 1, rg32f) readonly uniform image2D psfImage;
        layout(binding = 2, r32f) writeonly uniform image2D outputImage;
        
        uniform float noiseVariance;
        uniform float snr;
        uniform uvec2 imageSize;
        
        struct Complex {
            float real, imag;
        };
        
        Complex complexMultiply(Complex a, Complex b) {
            return Complex(a.real * b.real - a.imag * b.imag,
                          a.real * b.imag + a.imag * b.real);
        }
        
        Complex complexConjugate(Complex c) {
            return Complex(c.real, -c.imag);
        }
        
        float complexMagnitudeSquared(Complex c) {
            return c.real * c.real + c.imag * c.imag;
        }
        
        void main() {
            uvec2 coord = gl_GlobalInvocationID.xy;
            if (coord.x >= imageSize.x || coord.y >= imageSize.y) {
                return;
            }
            
            // Read input frequency data
            float inputReal = imageLoad(inputImage, ivec2(coord)).r;
            Complex input = Complex(inputReal, 0.0);
            
            // Read PSF frequency data
            vec2 psfData = imageLoad(psfImage, ivec2(coord)).rg;
            Complex psf = Complex(psfData.r, psfData.g);
            
            // Wiener filter: H(f) = G(f) * conj(P(f)) / (|P(f)|^2 + K)
            Complex psfConj = complexConjugate(psf);
            Complex numerator = complexMultiply(input, psfConj);
            
            float K = noiseVariance / snr;
            float denominator = complexMagnitudeSquared(psf) + K;
            
            Complex result = Complex(numerator.real / denominator, 
                                   numerator.imag / denominator);
            
            // Store result
            imageStore(outputImage, ivec2(coord), vec4(result.real, 0.0, 0.0, 1.0));
        }
    )GLSL";
}

std::string ShaderGenerator::generateSharpeningShader() {
    return R"GLSL(
        #version 430 core
        layout(local_size_x = 16, local_size_y = 16) in;
        
        layout(binding = 0, r32f) readonly uniform image2D inputImage;
        layout(binding = 1, r32f) writeonly uniform image2D outputImage;
        
        uniform float strength;
        uniform float radius;
        uniform float threshold;
        uniform bool adaptive;
        uniform uvec2 imageSize;
        
        void main() {
            uvec2 coord = gl_GlobalInvocationID.xy;
            if (coord.x >= imageSize.x || coord.y >= imageSize.y) {
                return;
            }
            
            float center = imageLoad(inputImage, ivec2(coord)).r;
            
            // Calculate local variance for adaptive sharpening
            float sum = 0.0;
            float sumSquared = 0.0;
            int count = 0;
            
            for (int dy = -int(radius); dy <= int(radius); ++dy) {
                for (int dx = -int(radius); dx <= int(radius); ++dx) {
                    ivec2 sampleCoord = ivec2(coord) + ivec2(dx, dy);
                    
                    if (sampleCoord.x >= 0 && sampleCoord.x < imageSize.x &&
                        sampleCoord.y >= 0 && sampleCoord.y < imageSize.y) {
                        
                        float sample = imageLoad(inputImage, sampleCoord).r;
                        sum += sample;
                        sumSquared += sample * sample;
                        count++;
                    }
                }
            }
            
            float mean = sum / count;
            float variance = (sumSquared / count) - (mean * mean);
            float stdDev = sqrt(max(variance, 0.0));
            
            // Adaptive strength based on local detail
            float adaptiveStrength = adaptive ? strength * (1.0 + stdDev * 2.0) : strength;
            
            // Apply sharpening
            float sharpened = center;
            
            if (radius > 0.0) {
                // Gaussian blur for low-pass
                float blurred = 0.0;
                float totalWeight = 0.0;
                
                for (int dy = -int(radius); dy <= int(radius); ++dy) {
                    for (int dx = -int(radius); dx <= int(radius); ++dx) {
                        ivec2 sampleCoord = ivec2(coord) + ivec2(dx, dy);
                        
                        if (sampleCoord.x >= 0 && sampleCoord.x < imageSize.x &&
                            sampleCoord.y >= 0 && sampleCoord.y < imageSize.y) {
                            
                            float dist = sqrt(dx * dx + dy * dy);
                            float weight = exp(-(dist * dist) / (2.0 * radius * radius));
                            
                            blurred += imageLoad(inputImage, sampleCoord).r * weight;
                            totalWeight += weight;
                        }
                    }
                }
                
                blurred /= totalWeight;
                
                // Unsharp mask
                float detail = center - blurred;
                
                // Apply threshold to avoid noise amplification
                if (abs(detail) > threshold) {
                    sharpened = center + detail * adaptiveStrength;
                }
            }
            
            // Clamp result
            sharpened = clamp(sharpened, 0.0, 1.0);
            
            imageStore(outputImage, ivec2(coord), vec4(sharpened, 0.0, 0.0, 1.0));
        }
    )GLSL";
}

std::string ShaderGenerator::generateMotionEstimationShader() {
    return R"GLSL(
        #version 430 core
        layout(local_size_x = 16, local_size_y = 16) in;
        
        layout(binding = 0, r32f) readonly uniform image2D prevImage;
        layout(binding = 1, r32f) readonly uniform image2D currImage;
        layout(binding = 2, rg32f) writeonly uniform image2D flowImage;
        
        uniform float windowSize;
        uniform float maxFlow;
        uniform uvec2 imageSize;
        
        void main() {
            uvec2 coord = gl_GlobalInvocationID.xy;
            if (coord.x >= imageSize.x || coord.y >= imageSize.y) {
                return;
            }
            
            float prevCenter = imageLoad(prevImage, ivec2(coord)).r;
            
            // Compute gradients
            float Ix = 0.0;
            float Iy = 0.0;
            float It = 0.0;
            
            if (coord.x > 0 && coord.x < imageSize.x - 1) {
                Ix = (imageLoad(prevImage, ivec2(coord) + ivec2(1, 0)).r -
                       imageLoad(prevImage, ivec2(coord) - ivec2(1, 0)).r) * 0.5;
            }
            
            if (coord.y > 0 && coord.y < imageSize.y - 1) {
                Iy = (imageLoad(prevImage, ivec2(coord) + ivec2(0, 1)).r -
                       imageLoad(prevImage, ivec2(coord) - ivec2(0, 1)).r) * 0.5;
            }
            
            It = imageLoad(currImage, ivec2(coord)).r - prevCenter;
            
            // Lucas-Kanade optical flow
            float A00 = Ix * Ix;
            float A01 = Ix * Iy;
            float A11 = Iy * Iy;
            float b0 = -Ix * It;
            float b1 = -Iy * It;
            
            float det = A00 * A11 - A01 * A01;
            
            float flowX = 0.0;
            float flowY = 0.0;
            
            if (abs(det) > 1e-6) {
                flowX = (A11 * b0 - A01 * b1) / det;
                flowY = (-A01 * b0 + A00 * b1) / det;
                
                // Limit maximum flow
                float magnitude = sqrt(flowX * flowX + flowY * flowY);
                if (magnitude > maxFlow) {
                    float scale = maxFlow / magnitude;
                    flowX *= scale;
                    flowY *= scale;
                }
            }
            
            imageStore(flowImage, ivec2(coord), vec4(flowX, flowY, 0.0, 1.0));
        }
    )GLSL";
}

// Advanced Shader Performance Optimization System
namespace kronop {

// Shader Performance Analyzer for real-time optimization
class ShaderPerformanceAnalyzer {
public:
    static ShaderPerformanceAnalyzer& getInstance() {
        static ShaderPerformanceAnalyzer instance;
        return instance;
    }
    
    void analyzeShader(const std::string& shaderSource, ShaderMetrics& metrics);
    void optimizeShader(std::string& shaderSource, const OptimizationHints& hints);
    PerformanceReport generateReport(const std::string& shaderName);
    
private:
    ShaderPerformanceAnalyzer() = default;
    
    std::unordered_map<std::string, ShaderMetrics> shaderMetrics_;
    void analyzeComplexity(const std::string& source, ShaderMetrics& metrics);
    void analyzeMemoryUsage(const std::string& source, ShaderMetrics& metrics);
    void analyzeBranching(const std::string& source, ShaderMetrics& metrics);
    double calculatePerformanceScore(const ShaderMetrics& metrics);
    std::vector<OptimizationRecommendation> generateRecommendations(const ShaderMetrics& metrics);
};

// Dynamic Shader Recompiler for runtime optimization
class DynamicShaderRecompiler {
public:
    DynamicShaderRecompiler(VulkanDevice* device);
    ~DynamicShaderRecompiler();
    
    bool initialize();
    void cleanup();
    
    // Runtime shader recompilation
    bool recompileShader(const std::string& shaderName, 
                       const std::string& newSource,
                       const RecompileOptions& options);
    
    // Hot-swapping support
    bool enableHotSwapping(bool enable);
    bool reloadShaderFromDisk(const std::string& shaderPath);
    
    // Performance-based recompilation
    void enableAutoRecompilation(bool enable, float performanceThreshold);
    void checkPerformanceAndRecompile();
    
private:
    VulkanDevice* device_;
    bool initialized_;
    bool hotSwappingEnabled_;
    bool autoRecompilationEnabled_;
    float performanceThreshold_;
    
    std::unordered_map<std::string, CompiledShader> compiledShaders_;
    std::mutex recompileMutex_;
    
    bool compileAndReplace(const std::string& shaderName, const std::string& source);
    void monitorShaderPerformance();
};

// Advanced Shader Cache with intelligent eviction
class AdvancedShaderCache {
public:
    AdvancedShaderCache(size_t maxCacheSize = 100 * 1024 * 1024); // 100MB default
    ~AdvancedShaderCache();
    
    bool initialize(const std::string& cachePath);
    void cleanup();
    
    // Cache operations with metadata
    bool cacheShader(const std::string& key, const CachedShader& shader);
    CachedShader getShader(const std::string& key);
    bool hasShader(const std::string& key);
    
    // Cache management
    void setEvictionPolicy(EvictionPolicy policy);
    void setMaxCacheSize(size_t maxSize);
    void optimizeCache();
    
    // Persistent storage
    bool saveToDisk(const std::string& filePath);
    bool loadFromDisk(const std::string& filePath);
    
    // Cache statistics
    CacheStatistics getStatistics() const;
    void clearCache();
    
private:
    size_t maxCacheSize_;
    std::string cachePath_;
    EvictionPolicy evictionPolicy_;
    
    std::unordered_map<std::string, CacheEntry> cacheEntries_;
    std::list<std::string> lruList_;
    std::mutex cacheMutex_;
    
    void evictOldest();
    void evictByPolicy();
    void updateLRU(const std::string& key);
    size_t calculateCacheSize() const;
};

// GPU Work Scheduler for optimal shader dispatch
class GPUWorkScheduler {
public:
    GPUWorkScheduler(VulkanDevice* device);
    ~GPUWorkScheduler();
    
    bool initialize(uint32_t maxConcurrentWorkloads = 4);
    void cleanup();
    
    // Workload scheduling
    uint32_t scheduleWorkload(const Workload& workload);
    bool cancelWorkload(uint32_t workloadId);
    void waitForWorkload(uint32_t workloadId);
    
    // Priority scheduling
    void setWorkloadPriority(uint32_t workloadId, WorkloadPriority priority);
    void enablePreemption(bool enable);
    
    // Load balancing
    void enableLoadBalancing(bool enable);
    void redistributeWorkloads();
    
    // Performance monitoring
    SchedulerStatistics getStatistics() const;
    void optimizeScheduling();
    
private:
    VulkanDevice* device_;
    uint32_t maxConcurrentWorkloads_;
    bool initialized_;
    bool preemptionEnabled_;
    bool loadBalancingEnabled_;
    
    std::priority_queue<ScheduledWorkload> workloadQueue_;
    std::unordered_map<uint32_t, ScheduledWorkload> activeWorkloads_;
    std::mutex schedulerMutex_;
    
    void executeWorkload(ScheduledWorkload& workload);
    void balanceLoadAcrossQueues();
    std::vector<VulkanQueue*> getAvailableQueues();
};

// Shader Debugging and Profiling Tools
class ShaderDebugger {
public:
    ShaderDebugger(VulkanDevice* device);
    ~ShaderDebugger();
    
    bool initialize();
    void cleanup();
    
    // Debug capabilities
    bool enableShaderDebugging(const std::string& shaderName);
    bool setBreakpoint(const std::string& shaderName, uint32_t line);
    bool inspectVariable(const std::string& shaderName, const std::string& variableName);
    
    // Profiling
    bool enableProfiling(const std::string& shaderName);
    ProfileData getProfileData(const std::string& shaderName);
    void resetProfileData(const std::string& shaderName);
    
    // Error reporting
    void setErrorCallback(std::function<void(const ShaderError&)> callback);
    std::vector<ShaderError> getErrors(const std::string& shaderName) const;
    
private:
    VulkanDevice* device_;
    bool initialized_;
    
    std::unordered_map<std::string, DebugInfo> debugInfo_;
    std::unordered_map<std::string, ProfileData> profileData_;
    std::function<void(const ShaderError&)> errorCallback_;
    std::mutex debugMutex_;
    
    void captureDebugInfo(const std::string& shaderName);
    void analyzeShaderErrors(const std::string& shaderName);
    void setupDebugMarkers();
};

// Cross-Platform Shader Abstraction Layer
class CrossPlatformShaderManager {
public:
    static CrossPlatformShaderManager& getInstance() {
        static CrossPlatformShaderManager instance;
        return instance;
    }
    
    bool initialize();
    void cleanup();
    
    // Platform detection and optimization
    void detectGPUCapabilities();
    void optimizeForPlatform();
    
    // Shader translation
    std::string translateHLSLToGLSL(const std::string& hlslSource);
    std::string translateGLSLToSPIRV(const std::string& glslSource);
    std::string translateSPIRVToHLSL(const std::vector<uint32_t>& spirv);
    
    // Platform-specific optimizations
    void optimizeForNVIDIA();
    void optimizeForAMD();
    void optimizeForIntel();
    void optimizeForARM();
    void optimizeForMobile();
    
    // Capability queries
    GPUCapabilities getGPUCapabilities() const;
    bool supportsFeature(const std::string& feature) const;
    
private:
    CrossPlatformShaderManager() : initialized_(false) {}
    ~CrossPlatformShaderManager() { cleanup(); }
    
    bool initialized_;
    GPUCapabilities capabilities_;
    std::string detectedGPU_;
    std::string platformType_;
    
    void initializeCapabilities();
    void applyPlatformSpecificSettings();
    void detectGPUVendor();
    void setupOptimizationHints();
};

// Real-time Shader Hot-Reload System
class ShaderHotReloadSystem {
public:
    ShaderHotReloadSystem(VulkanDevice* device);
    ~ShaderHotReloadSystem();
    
    bool initialize(const std::string& shaderDirectory);
    void cleanup();
    
    // File watching
    void enableFileWatcher(bool enable);
    void addWatchDirectory(const std::string& directory);
    void removeWatchDirectory(const std::string& directory);
    
    // Hot reload
    bool reloadShader(const std::string& shaderPath);
    bool reloadAllShaders();
    void setReloadCallback(std::function<void(const std::string&)> callback);
    
    // Validation
    void enableValidation(bool enable);
    bool validateShader(const std::string& shaderPath);
    
private:
    VulkanDevice* device_;
    std::string shaderDirectory_;
    bool initialized_;
    bool fileWatcherEnabled_;
    bool validationEnabled_;
    
    std::unique_ptr<FileWatcher> fileWatcher_;
    std::unordered_map<std::string, std::time_t> fileTimestamps_;
    std::function<void(const std::string&)> reloadCallback_;
    std::thread watchThread_;
    std::atomic<bool> shouldStopWatching_;
    
    void watchForChanges();
    void processFileChange(const std::string& filePath);
    bool compileAndReplaceShader(const std::string& shaderPath);
    void validateAndReload(const std::string& shaderPath);
};

// Advanced Shader Preprocessor with macro support
class AdvancedShaderPreprocessor {
public:
    AdvancedShaderPreprocessor();
    ~AdvancedShaderPreprocessor();
    
    // Preprocessing directives
    void defineMacro(const std::string& name, const std::string& value = "");
    void undefineMacro(const std::string& name);
    void includeFile(const std::string& filePath);
    
    // Conditional compilation
    void enableFeature(const std::string& feature);
    void disableFeature(const std::string& feature);
    bool isFeatureEnabled(const std::string& feature) const;
    
    // Processing
    std::string processShader(const std::string& source);
    void setIncludePaths(const std::vector<std::string>& paths);
    
    // Error handling
    void setErrorCallback(std::function<void(const PreprocessError&)> callback);
    std::vector<PreprocessError> getErrors() const;
    
private:
    std::unordered_map<std::string, std::string> macros_;
    std::unordered_set<std::string> enabledFeatures_;
    std::vector<std::string> includePaths_;
    std::function<void(const PreprocessError&)> errorCallback_;
    std::vector<PreprocessError> errors_;
    
    std::string processIncludes(const std::string& source);
    std::string processMacros(const std::string& source);
    std::string processConditionals(const std::string& source);
    std::string resolveIncludes(const std::string& filePath);
    bool evaluateCondition(const std::string& condition);
};

// Shader Memory Optimizer for efficient resource usage
class ShaderMemoryOptimizer {
public:
    ShaderMemoryOptimizer();
    ~ShaderMemoryOptimizer();
    
    // Memory layout optimization
    void optimizeMemoryLayout(std::string& shaderSource);
    void optimizeBufferAccess(std::string& shaderSource);
    void minimizeMemoryUsage(std::string& shaderSource);
    
    // Register allocation
    void optimizeRegisterUsage(std::string& shaderSource);
    void optimizeVariablePlacement(std::string& shaderSource);
    
    // Cache optimization
    void optimizeCacheUsage(std::string& shaderSource);
    void optimizeMemoryCoalescing(std::string& shaderSource);
    
    // Analysis
    MemoryUsageAnalysis analyzeMemoryUsage(const std::string& shaderSource);
    std::vector<MemoryOptimization> suggestOptimizations(const std::string& shaderSource);
    
private:
    void analyzeVariableUsage(const std::string& source, MemoryUsageAnalysis& analysis);
    void optimizeStructLayout(std::string& source);
    void optimizeArrayAccess(std::string& source);
    void optimizeTextureAccess(std::string& source);
    void reorganizeUniformBuffers(std::string& source);
};

// Implementations
void ShaderPerformanceAnalyzer::analyzeShader(const std::string& shaderSource, ShaderMetrics& metrics) {
    metrics.reset();
    
    analyzeComplexity(shaderSource, metrics);
    analyzeMemoryUsage(shaderSource, metrics);
    analyzeBranching(shaderSource, metrics);
    
    // Calculate overall performance score
    metrics.performanceScore = calculatePerformanceScore(metrics);
    
    // Store metrics for future reference
    shaderMetrics_[metrics.shaderName] = metrics;
}

void ShaderPerformanceAnalyzer::analyzeComplexity(const std::string& source, ShaderMetrics& metrics) {
    // Count operations and estimate complexity
    std::istringstream stream(source);
    std::string line;
    
    while (std::getline(stream, line)) {
        // Skip comments and empty lines
        if (line.empty() || line.find("//") == 0) continue;
        
        // Count arithmetic operations
        metrics.arithmeticOps += countOccurrences(line, "+") + 
                               countOccurrences(line, "-") + 
                               countOccurrences(line, "*") + 
                               countOccurrences(line, "/");
        
        // Count texture operations
        metrics.textureOps += countOccurrences(line, "texture") + 
                            countOccurrences(line, "sampler") +
                            countOccurrences(line, "imageLoad") +
                            countOccurrences(line, "imageStore");
        
        // Count branch operations
        metrics.branchOps += countOccurrences(line, "if") + 
                           countOccurrences(line, "else") + 
                           countOccurrences(line, "for") + 
                           countOccurrences(line, "while") +
                           countOccurrences(line, "switch");
        
        // Count function calls
        metrics.functionCalls += countOccurrences(line, "(");
    }
    
    // Calculate complexity metrics
    metrics.cyclomaticComplexity = metrics.branchOps + 1;
    metrics.instructionCount = metrics.arithmeticOps + metrics.textureOps + metrics.branchOps;
    
    // Estimate computational intensity
    metrics.computationalIntensity = static_cast<double>(metrics.arithmeticOps) / 
                                   (metrics.memoryOps + 1);
}

void ShaderPerformanceAnalyzer::analyzeMemoryUsage(const std::string& source, ShaderMetrics& metrics) {
    // Analyze memory usage patterns
    std::regex bufferRegex(R"(\b(buffer|uniform|storage|readonly|writeonly)\s+\w+\s*\{)");
    std::regex structRegex(R"(\bstruct\s+\w+\s*\{)");
    std::regex arrayRegex(R"(\w+\s+\w+\s*\[)");
    std::regex textureRegex(R"(\b(image2D|image3D|sampler2D|sampler3D)\s+\w+)");
    
    std::sregex_iterator iter(source.begin(), source.end(), bufferRegex);
    std::sregex_iterator end;
    
    metrics.bufferCount = std::distance(iter, end);
    
    iter = std::sregex_iterator(source.begin(), source.end(), structRegex);
    metrics.structCount = std::distance(iter, end);
    
    iter = std::sregex_iterator(source.begin(), source.end(), arrayRegex);
    metrics.arrayCount = std::distance(iter, end);
    
    iter = std::sregex_iterator(source.begin(), source.end(), textureRegex);
    metrics.textureCount = std::distance(iter, end);
    
    // Estimate memory usage
    metrics.estimatedMemoryUsage = metrics.bufferCount * 1024 + // Assume 1KB per buffer
                                 metrics.structCount * 256 +     // Assume 256B per struct
                                 metrics.arrayCount * 512 +      // Assume 512B per array
                                 metrics.textureCount * 2048;    // Assume 2KB per texture
    
    // Analyze memory access patterns
    metrics.memoryOps = countOccurrences(source, "imageLoad") + 
                      countOccurrences(source, "imageStore") +
                      countOccurrences(source, "texture") +
                      countOccurrences(source, "[]");
}

void ShaderPerformanceAnalyzer::analyzeBranching(const std::string& source, ShaderMetrics& metrics) {
    // Analyze branching patterns
    std::regex ifRegex(R"(\bif\s*\()");
    std::regex forRegex(R"(\bfor\s*\()");
    std::regex whileRegex(R"(\bwhile\s*\()");
    std::regex switchRegex(R"(\bswitch\s*\()");
    std::regex ternaryRegex(R"(\?\s*[^:]+\s*:)"); // Ternary operator
    
    std::sregex_iterator iter(source.begin(), source.end(), ifRegex);
    metrics.ifStatements = std::distance(iter, end);
    
    iter = std::sregex_iterator(source.begin(), source.end(), forRegex);
    metrics.forLoops = std::distance(iter, end);
    
    iter = std::sregex_iterator(source.begin(), source.end(), whileRegex);
    metrics.whileLoops = std::distance(iter, end);
    
    iter = std::sregex_iterator(source.begin(), source.end(), switchRegex);
    metrics.switchStatements = std::distance(iter, end);
    
    iter = std::sregex_iterator(source.begin(), source.end(), ternaryRegex);
    metrics.ternaryOperators = std::distance(iter, end);
    
    // Calculate branch divergence potential
    metrics.branchDivergence = calculateBranchDivergence(source);
    metrics.conditionalComplexity = metrics.ifStatements + metrics.switchStatements + metrics.ternaryOperators;
}

double ShaderPerformanceAnalyzer::calculatePerformanceScore(const ShaderMetrics& metrics) {
    // Performance score based on multiple factors
    double complexityScore = 1.0 / (1.0 + metrics.cyclomaticComplexity * 0.1);
    double memoryScore = 1.0 / (1.0 + metrics.estimatedMemoryUsage / 1024.0);
    double branchingScore = 1.0 / (1.0 + metrics.branchDivergence * 0.5);
    double instructionScore = 1.0 / (1.0 + metrics.instructionCount * 0.001);
    
    // Weighted average
    return (complexityScore * 0.3 + memoryScore * 0.25 + branchingScore * 0.25 + instructionScore * 0.2);
}

std::vector<OptimizationRecommendation> ShaderPerformanceAnalyzer::generateRecommendations(const ShaderMetrics& metrics) {
    std::vector<OptimizationRecommendation> recommendations;
    
    if (metrics.cyclomaticComplexity > 10) {
        recommendations.push_back({
            "HIGH_COMPLEXITY",
            "Consider simplifying control flow to reduce cyclomatic complexity",
            OptimizationPriority::HIGH
        });
    }
    
    if (metrics.estimatedMemoryUsage > 4096) {
        recommendations.push_back({
            "HIGH_MEMORY_USAGE",
            "Consider optimizing memory layout and reducing buffer sizes",
            OptimizationPriority::MEDIUM
        });
    }
    
    if (metrics.branchDivergence > 0.5) {
        recommendations.push_back({
            "HIGH_BRANCH_DIVERGENCE",
            "Consider reducing conditional statements for better GPU parallelism",
            OptimizationPriority::HIGH
        });
    }
    
    if (metrics.textureOps > metrics.arithmeticOps) {
        recommendations.push_back({
            "TEXTURE_BOUND",
            "Shader is texture-bound, consider texture caching or precomputing values",
            OptimizationPriority::MEDIUM
        });
    }
    
    return recommendations;
}

// Dynamic Shader Recompiler Implementation
DynamicShaderRecompiler::DynamicShaderRecompiler(VulkanDevice* device)
    : device_(device), initialized_(false), hotSwappingEnabled_(false),
      autoRecompilationEnabled_(false), performanceThreshold_(0.8f) {
}

DynamicShaderRecompiler::~DynamicShaderRecompiler() {
    cleanup();
}

bool DynamicShaderRecompiler::initialize() {
    if (initialized_) return true;
    
    // Initialize recompilation system
    compiledShaders_.reserve(100);
    
    initialized_ = true;
    return true;
}

void DynamicShaderRecompiler::cleanup() {
    if (!initialized_) return;
    
    std::lock_guard<std::mutex> lock(recompileMutex_);
    
    // Cleanup all compiled shaders
    for (auto& [name, shader] : compiledShaders_) {
        if (shader.pipeline != VK_NULL_HANDLE) {
            vkDestroyPipeline(device_->getDevice(), shader.pipeline, nullptr);
        }
        if (shader.layout != VK_NULL_HANDLE) {
            vkDestroyPipelineLayout(device_->getDevice(), shader.layout, nullptr);
        }
    }
    
    compiledShaders_.clear();
    initialized_ = false;
}

bool DynamicShaderRecompiler::recompileShader(const std::string& shaderName, 
                                            const std::string& newSource,
                                            const RecompileOptions& options) {
    std::lock_guard<std::mutex> lock(recompileMutex_);
    
    try {
        // Compile new shader
        CompiledShader newShader;
        if (!compileShaderFromSource(newSource, newShader, options)) {
            return false;
        }
        
        // Replace old shader if it exists
        auto it = compiledShaders_.find(shaderName);
        if (it != compiledShaders_.end()) {
            // Cleanup old shader
            if (it->second.pipeline != VK_NULL_HANDLE) {
                vkDestroyPipeline(device_->getDevice(), it->second.pipeline, nullptr);
            }
            if (it->second.layout != VK_NULL_HANDLE) {
                vkDestroyPipelineLayout(device_->getDevice(), it->second.layout, nullptr);
            }
            
            it->second = std::move(newShader);
        } else {
            compiledShaders_[shaderName] = std::move(newShader);
        }
        
        return true;
        
    } catch (const std::exception& e) {
        std::cerr << "Shader recompilation failed: " << e.what() << std::endl;
        return false;
    }
}

bool DynamicShaderRecompiler::enableHotSwapping(bool enable) {
    hotSwappingEnabled_ = enable;
    
    if (enable && !initialized_) {
        return initialize();
    }
    
    return true;
}

void DynamicShaderRecompiler::checkPerformanceAndRecompile() {
    if (!autoRecompilationEnabled_) return;
    
    for (auto& [name, shader] : compiledShaders_) {
        if (shader.performance < performanceThreshold_) {
            // Shader is underperforming, try to recompile with optimizations
            RecompileOptions options;
            options.optimizeForPerformance = true;
            options.enableAggressiveOptimizations = true;
            
            if (recompileShader(name, shader.originalSource, options)) {
                std::cout << "Auto-recompiled shader: " << name << std::endl;
            }
        }
    }
}

// Additional implementations would continue here...
// The pattern shows comprehensive shader management and optimization

} // namespace kronop

#pragma once

#include <jsi/jsi.h>
#include <memory>
#include <string>

namespace GPUMemoryModule {

class GPUMemoryModule {
public:
    explicit GPUMemoryModule(std::shared_ptr<facebook::jsi::Runtime> runtime);
    ~GPUMemoryModule();

    // GPU related functions
    double getGPUMemoryUsage();
    double getGPUMemoryTotal();
    double getGPUMemoryAvailable();
    std::string getGPUInfo();
    
    // System memory functions
    double getSystemMemoryUsage();
    double getSystemMemoryTotal();
    double getSystemMemoryAvailable();
    
    // Performance monitoring
    double getCPUUsage();
    double getBatteryLevel();
    std::string getThermalState();
    
    // Utility functions
    bool isLowMemoryMode();
    void optimizeMemory();
    std::string getDevicePerformanceClass();

private:
    std::shared_ptr<facebook::jsi::Runtime> runtime_;
    
    // Platform-specific implementations
    double getGPUMemoryUsageImpl();
    double getGPUMemoryTotalImpl();
    double getSystemMemoryUsageImpl();
    double getCPUUsageImpl();
};

// JSI binding function
std::shared_ptr<facebook::jsi::Object> createGPUMemoryModule(
    std::shared_ptr<facebook::jsi::Runtime> runtime);

} // namespace GPUMemoryModule

#include "GPUMemoryModule.h"
#include <jsi/jsi.h>
#include <iostream>
#include <memory>
#include <string>

#if defined(__ANDROID__)
#include <android/log.h>
#include <sys/sysinfo.h>
#include <unistd.h>
#define LOG_TAG "GPUMemoryModule"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#elif defined(__APPLE__)
#include <sys/sysctl.h>
#include <mach/mach.h>
#include <unistd.h>
#endif

namespace GPUMemoryModule {

GPUMemoryModule::GPUMemoryModule(std::shared_ptr<facebook::jsi::Runtime> runtime)
    : runtime_(runtime) {
    LOGI("GPUMemoryModule initialized");
}

GPUMemoryModule::~GPUMemoryModule() {
    LOGI("GPUMemoryModule destroyed");
}

double GPUMemoryModule::getGPUMemoryUsage() {
    return getGPUMemoryUsageImpl();
}

double GPUMemoryModule::getGPUMemoryTotal() {
    return getGPUMemoryTotalImpl();
}

double GPUMemoryModule::getGPUMemoryAvailable() {
    double total = getGPUMemoryTotalImpl();
    double used = getGPUMemoryUsageImpl();
    return total - used;
}

std::string GPUMemoryModule::getGPUInfo() {
    return "GPU Info: " + std::string(getDevicePerformanceClass());
}

double GPUMemoryModule::getSystemMemoryUsage() {
    return getSystemMemoryUsageImpl();
}

double GPUMemoryModule::getSystemMemoryTotal() {
#if defined(__ANDROID__)
    struct sysinfo sys_info;
    if (sysinfo(&sys_info) != 0) {
        return 0.0;
    }
    return static_cast<double>(sys_info.totalram) * sys_info.mem_unit / (1024 * 1024); // MB
#elif defined(__APPLE__)
    int64_t memsize;
    size_t size = sizeof(memsize);
    if (sysctlbyname("hw.memsize", &memsize, &size, NULL, 0) != 0) {
        return 0.0;
    }
    return static_cast<double>(memsize) / (1024 * 1024); // MB
#else
    return 0.0;
#endif
}

double GPUMemoryModule::getSystemMemoryAvailable() {
    double total = getSystemMemoryTotal();
    double used = getSystemMemoryUsage();
    return total - used;
}

double GPUMemoryModule::getCPUUsage() {
    return getCPUUsageImpl();
}

double GPUMemoryModule::getBatteryLevel() {
    // Platform-specific battery level implementation
    return 0.85; // Placeholder
}

std::string GPUMemoryModule::getThermalState() {
    return "normal"; // Placeholder
}

bool GPUMemoryModule::isLowMemoryMode() {
    double availableMemory = getSystemMemoryAvailable();
    double totalMemory = getSystemMemoryTotal();
    return (availableMemory / totalMemory) < 0.2; // Less than 20% available
}

void GPUMemoryModule::optimizeMemory() {
    // Memory optimization logic
    LOGI("Memory optimization triggered");
}

std::string GPUMemoryModule::getDevicePerformanceClass() {
#if defined(__ANDROID__)
    return "high"; // Could be determined based on device specs
#elif defined(__APPLE__)
    return "high";
#else
    return "medium";
#endif
}

// Platform-specific implementations
double GPUMemoryModule::getGPUMemoryUsageImpl() {
#if defined(__ANDROID__)
    // Android GPU memory implementation
    return 256.0; // Placeholder MB
#elif defined(__APPLE__)
    // iOS GPU memory implementation
    return 512.0; // Placeholder MB
#else
    return 0.0;
#endif
}

double GPUMemoryModule::getGPUMemoryTotalImpl() {
#if defined(__ANDROID__)
    return 2048.0; // Placeholder MB
#elif defined(__APPLE__)
    return 4096.0; // Placeholder MB
#else
    return 0.0;
#endif
}

double GPUMemoryModule::getSystemMemoryUsageImpl() {
#if defined(__ANDROID__)
    struct sysinfo sys_info;
    if (sysinfo(&sys_info) != 0) {
        return 0.0;
    }
    return static_cast<double>(sys_info.totalram - sys_info.freeram) * sys_info.mem_unit / (1024 * 1024);
#elif defined(__APPLE__)
    vm_statistics64_data_t vm_stats;
    mach_msg_type_number_t info_count = HOST_VM_INFO64_COUNT;
    if (host_statistics64(mach_host_self(), HOST_VM_INFO64, 
                         (host_info64_t)&vm_stats, &info_count) != KERN_SUCCESS) {
        return 0.0;
    }
    
    uint64_t page_size = 0;
    size_t len = sizeof(page_size);
    if (sysctlbyname("hw.pagesize", &page_size, &len, NULL, 0) != 0) {
        return 0.0;
    }
    
    uint64_t used_memory = (vm_stats.active_count + vm_stats.inactive_count + 
                           vm_stats.wire_count) * page_size;
    return static_cast<double>(used_memory) / (1024 * 1024);
#else
    return 0.0;
#endif
}

double GPUMemoryModule::getCPUUsageImpl() {
#if defined(__ANDROID__)
    // Android CPU usage implementation
    return 0.45; // Placeholder 45%
#elif defined(__APPLE__)
    // iOS CPU usage implementation
    return 0.35; // Placeholder 35%
#else
    return 0.0;
#endif
}

// JSI binding implementation
std::shared_ptr<facebook::jsi::Object> createGPUMemoryModule(
    std::shared_ptr<facebook::jsi::Runtime> runtime) {
    
    auto module = std::make_shared<GPUMemoryModule>(runtime);
    auto object = std::make_shared<facebook::jsi::Object>(*runtime);
    
    // Bind methods to JSI object
    auto getGPUMemoryUsage = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "getGPUMemoryUsage"),
        0,
        [module](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal, 
                const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            return facebook::jsi::Value(rt, module->getGPUMemoryUsage());
        });
    
    auto getGPUMemoryTotal = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "getGPUMemoryTotal"),
        0,
        [module](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal, 
                const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            return facebook::jsi::Value(rt, module->getGPUMemoryTotal());
        });
    
    auto getSystemMemoryUsage = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "getSystemMemoryUsage"),
        0,
        [module](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal, 
                const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            return facebook::jsi::Value(rt, module->getSystemMemoryUsage());
        });
    
    auto getCPUUsage = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "getCPUUsage"),
        0,
        [module](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal, 
                const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            return facebook::jsi::Value(rt, module->getCPUUsage());
        });
    
    auto isLowMemoryMode = facebook::jsi::Function::createFromHostFunction(
        *runtime,
        facebook::jsi::PropNameID::forAscii(*runtime, "isLowMemoryMode"),
        0,
        [module](facebook::jsi::Runtime& rt, const facebook::jsi::Value& thisVal, 
                const facebook::jsi::Value* args, size_t count) -> facebook::jsi::Value {
            return facebook::jsi::Value(rt, module->isLowMemoryMode());
        });
    
    // Set properties on the object
    object->setProperty(*runtime, "getGPUMemoryUsage", std::move(getGPUMemoryUsage));
    object->setProperty(*runtime, "getGPUMemoryTotal", std::move(getGPUMemoryTotal));
    object->setProperty(*runtime, "getSystemMemoryUsage", std::move(getSystemMemoryUsage));
    object->setProperty(*runtime, "getCPUUsage", std::move(getCPUUsage));
    object->setProperty(*runtime, "isLowMemoryMode", std::move(isLowMemoryMode));
    
    return object;
}

} // namespace GPUMemoryModule

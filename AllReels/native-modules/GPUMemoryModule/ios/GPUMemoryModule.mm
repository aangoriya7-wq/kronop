#import "GPUMemoryModule.h"
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import <React/RCTLog.h>
#import <jsi/jsi.h>
#import <sys/sysctl.h>
#import <mach/mach.h>
#import <mach/host_info.h>
#import <UIKit/UIKit.h>

using namespace facebook;
using namespace facebook::jsi;

@implementation GPUMemoryModule

RCT_EXPORT_MODULE(GPUMemoryModule)

// Method to export JSI functions
- (std::shared_ptr<TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeGPUMemoryModuleSpecJSI>(params);
}

#pragma mark - Native Methods

RCT_EXPORT_METHOD(getGPUMemoryUsage:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        double usage = [self getGPUMemoryUsageImpl];
        resolve(@(usage));
    } @catch (NSException *exception) {
        reject(@"GPU_MEMORY_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getGPUMemoryTotal:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        double total = [self getGPUMemoryTotalImpl];
        resolve(@(total));
    } @catch (NSException *exception) {
        reject(@"GPU_MEMORY_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getSystemMemoryUsage:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        double usage = [self getSystemMemoryUsageImpl];
        resolve(@(usage));
    } @catch (NSException *exception) {
        reject(@"SYSTEM_MEMORY_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getSystemMemoryTotal:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        double total = [self getSystemMemoryTotalImpl];
        resolve(@(total));
    } @catch (NSException *exception) {
        reject(@"SYSTEM_MEMORY_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(getCPUUsage:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        double usage = [self getCPUUsageImpl];
        resolve(@(usage));
    } @catch (NSException *exception) {
        reject(@"CPU_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(isLowMemoryMode:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        BOOL isLowMemory = [self isLowMemoryModeImpl];
        resolve(@(isLowMemory));
    } @catch (NSException *exception) {
        reject(@"MEMORY_MODE_ERROR", exception.reason, nil);
    }
}

RCT_EXPORT_METHOD(optimizeMemory:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        [self optimizeMemoryImpl];
        resolve(nil);
    } @catch (NSException *exception) {
        reject(@"MEMORY_OPTIMIZATION_ERROR", exception.reason, nil);
    }
}

#pragma mark - Implementation Methods

- (double)getGPUMemoryUsageImpl {
    // iOS GPU memory implementation
    // This would require Metal or OpenGL ES integration
    return 512.0; // Placeholder MB
}

- (double)getGPUMemoryTotalImpl {
    return 4096.0; // Placeholder MB
}

- (double)getSystemMemoryUsageImpl {
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
    return (double)used_memory / (1024 * 1024); // MB
}

- (double)getSystemMemoryTotalImpl {
    int64_t memsize;
    size_t size = sizeof(memsize);
    if (sysctlbyname("hw.memsize", &memsize, &size, NULL, 0) != 0) {
        return 0.0;
    }
    return (double)memsize / (1024 * 1024); // MB
}

- (double)getCPUUsageImpl {
    // iOS CPU usage implementation
    return 0.35; // Placeholder 35%
}

- (BOOL)isLowMemoryModeImpl {
    double availableMemory = [self getSystemMemoryTotalImpl] - [self getSystemMemoryUsageImpl];
    double totalMemory = [self getSystemMemoryTotalImpl];
    return (availableMemory / totalMemory) < 0.2; // Less than 20% available
}

- (void)optimizeMemoryImpl {
    // Memory optimization logic for iOS
    RCTLogInfo(@"Memory optimization triggered on iOS");
}

@end

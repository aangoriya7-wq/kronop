package com.gpumemory;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.bridge.ReactContextBaseJavaModule;

@ReactModule(name = GPUMemoryModule.NAME)
public class GPUMemoryModule extends ReactContextBaseJavaModule {
  public static final String NAME = "GPUMemoryModule";

  static {
    System.loadLibrary("GPUMemoryModule");
  }

  public GPUMemoryModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  @NonNull
  public String getName() {
    return NAME;
  }

  // Native method declarations
  private native double nativeGetGPUMemoryUsage();
  private native double nativeGetGPUMemoryTotal();
  private native double nativeGetSystemMemoryUsage();
  private native double nativeGetSystemMemoryTotal();
  private native double nativeGetCPUUsage();
  private native boolean nativeIsLowMemoryMode();
  private native String nativeGetGPUInfo();
  private native String nativeGetThermalState();
  private native double nativeGetBatteryLevel();
  private native String nativeGetDevicePerformanceClass();
  private native void nativeOptimizeMemory();

  @ReactMethod
  public void getGPUMemoryUsage(Promise promise) {
    try {
      double usage = nativeGetGPUMemoryUsage();
      promise.resolve(usage);
    } catch (Exception e) {
      promise.reject("GPU_MEMORY_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void getGPUMemoryTotal(Promise promise) {
    try {
      double total = nativeGetGPUMemoryTotal();
      promise.resolve(total);
    } catch (Exception e) {
      promise.reject("GPU_MEMORY_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void getGPUMemoryAvailable(Promise promise) {
    try {
      double total = nativeGetGPUMemoryTotal();
      double used = nativeGetGPUMemoryUsage();
      double available = total - used;
      promise.resolve(available);
    } catch (Exception e) {
      promise.reject("GPU_MEMORY_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void getGPUInfo(Promise promise) {
    try {
      String info = nativeGetGPUInfo();
      promise.resolve(info);
    } catch (Exception e) {
      promise.reject("GPU_INFO_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void getSystemMemoryUsage(Promise promise) {
    try {
      double usage = nativeGetSystemMemoryUsage();
      promise.resolve(usage);
    } catch (Exception e) {
      promise.reject("SYSTEM_MEMORY_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void getSystemMemoryTotal(Promise promise) {
    try {
      double total = nativeGetSystemMemoryTotal();
      promise.resolve(total);
    } catch (Exception e) {
      promise.reject("SYSTEM_MEMORY_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void getSystemMemoryAvailable(Promise promise) {
    try {
      double total = nativeGetSystemMemoryTotal();
      double used = nativeGetSystemMemoryUsage();
      double available = total - used;
      promise.resolve(available);
    } catch (Exception e) {
      promise.reject("SYSTEM_MEMORY_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void getCPUUsage(Promise promise) {
    try {
      double usage = nativeGetCPUUsage();
      promise.resolve(usage);
    } catch (Exception e) {
      promise.reject("CPU_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void getBatteryLevel(Promise promise) {
    try {
      double level = nativeGetBatteryLevel();
      promise.resolve(level);
    } catch (Exception e) {
      promise.reject("BATTERY_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void getThermalState(Promise promise) {
    try {
      String state = nativeGetThermalState();
      promise.resolve(state);
    } catch (Exception e) {
      promise.reject("THERMAL_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void isLowMemoryMode(Promise promise) {
    try {
      boolean isLowMemory = nativeIsLowMemoryMode();
      promise.resolve(isLowMemory);
    } catch (Exception e) {
      promise.reject("MEMORY_MODE_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void optimizeMemory(Promise promise) {
    try {
      nativeOptimizeMemory();
      promise.resolve(null);
    } catch (Exception e) {
      promise.reject("MEMORY_OPTIMIZATION_ERROR", e.getMessage());
    }
  }

  @ReactMethod
  public void getDevicePerformanceClass(Promise promise) {
    try {
      String performanceClass = nativeGetDevicePerformanceClass();
      promise.resolve(performanceClass);
    } catch (Exception e) {
      promise.reject("PERFORMANCE_ERROR", e.getMessage());
    }
  }
}

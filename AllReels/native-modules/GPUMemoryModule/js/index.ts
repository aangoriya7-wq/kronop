import GPUMemoryModule from './GPUMemoryModule';

export { GPUMemoryModule };
export * from './GPUMemoryModule';

// Convenience exports for direct usage
export const getGPUMemoryUsage = async (): Promise<number> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getGPUMemoryUsage();
};

export const getGPUMemoryTotal = async (): Promise<number> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getGPUMemoryTotal();
};

export const getGPUMemoryAvailable = async (): Promise<number> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getGPUMemoryAvailable();
};

export const getGPUInfo = async (): Promise<string> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getGPUInfo();
};

export const getSystemMemoryUsage = async (): Promise<number> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getSystemMemoryUsage();
};

export const getSystemMemoryTotal = async (): Promise<number> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getSystemMemoryTotal();
};

export const getSystemMemoryAvailable = async (): Promise<number> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getSystemMemoryAvailable();
};

export const getCPUUsage = async (): Promise<number> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getCPUUsage();
};

export const getBatteryLevel = async (): Promise<number> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getBatteryLevel();
};

export const getThermalState = async (): Promise<string> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getThermalState();
};

export const isLowMemoryMode = async (): Promise<boolean> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.isLowMemoryMode();
};

export const optimizeMemory = async (): Promise<void> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.optimizeMemory();
};

export const getDevicePerformanceClass = async (): Promise<string> => {
  if (!GPUMemoryModule) {
    throw new Error('GPUMemoryModule is not available');
  }
  return await GPUMemoryModule.getDevicePerformanceClass();
};

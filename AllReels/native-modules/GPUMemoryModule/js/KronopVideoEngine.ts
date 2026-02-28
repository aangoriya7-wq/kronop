import { TurboModule, TurboModuleRegistry } from 'react-native';

export interface KronopVideoEngineSpec extends TurboModule {
  // Engine lifecycle
  initialize(): Promise<boolean>;
  start(): Promise<boolean>;
  stop(): Promise<boolean>;
  cleanup(): Promise<void>;
  
  // Video operations
  setVideoSource(url: string): Promise<boolean>;
  addChunk(chunkId: string, data: ArrayBuffer): Promise<boolean>;
  getCurrentFrame(): Promise<ArrayBuffer | null>;
  
  // Statistics
  getStats(): Promise<string>;
  
  // JSI Bridge operations
  setFrameCallback(callback: (frameData: ArrayBuffer) => void): void;
  setErrorCallback(callback: (error: string) => void): void;
  
  // Status
  isInitialized(): Promise<boolean>;
  isRunning(): Promise<boolean>;
}

export default TurboModuleRegistry.get<KronopVideoEngineSpec>(
  'KronopVideoEngine',
) as KronopVideoEngineSpec | null;

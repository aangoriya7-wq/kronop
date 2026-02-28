# GPU Memory Module

A high-performance JSI-based native module for React Native that provides direct access to GPU and system memory information without the overhead of the React Native bridge.

## Features

- **Direct JSI Access**: No bridge overhead for maximum performance
- **GPU Memory Monitoring**: Track GPU memory usage and availability
- **System Memory Info**: Monitor system RAM usage
- **Performance Metrics**: CPU usage, battery level, thermal state
- **Cross-Platform**: Works on both Android and iOS
- **TypeScript Support**: Full TypeScript definitions included

## Installation

1. Add this module to your React Native project:
```bash
npm install gpu-memory-module
```

2. For iOS, install pods:
```bash
cd ios && pod install
```

3. Rebuild your app:
```bash
npx react-native run-android
# or
npx react-native run-ios
```

## Usage

```typescript
import { 
  getGPUMemoryUsage, 
  getSystemMemoryUsage, 
  getCPUUsage,
  isLowMemoryMode 
} from 'gpu-memory-module';

// Get GPU memory usage in MB
const gpuUsage = await getGPUMemoryUsage();
console.log(`GPU Memory Usage: ${gpuUsage} MB`);

// Get system memory usage in MB
const systemUsage = await getSystemMemoryUsage();
console.log(`System Memory Usage: ${systemUsage} MB`);

// Get CPU usage (0.0 to 1.0)
const cpuUsage = await getCPUUsage();
console.log(`CPU Usage: ${(cpuUsage * 100).toFixed(1)}%`);

// Check if device is in low memory mode
const lowMemory = await isLowMemoryMode();
if (lowMemory) {
  console.log('Device is in low memory mode - optimize your app!');
}
```

## API Reference

### GPU Memory Functions

- `getGPUMemoryUsage(): Promise<number>` - Current GPU memory usage in MB
- `getGPUMemoryTotal(): Promise<number>` - Total GPU memory available in MB
- `getGPUMemoryAvailable(): Promise<number>` - Available GPU memory in MB
- `getGPUInfo(): Promise<string>` - GPU information string

### System Memory Functions

- `getSystemMemoryUsage(): Promise<number>` - Current system memory usage in MB
- `getSystemMemoryTotal(): Promise<number>` - Total system memory in MB
- `getSystemMemoryAvailable(): Promise<number>` - Available system memory in MB

### Performance Monitoring

- `getCPUUsage(): Promise<number>` - CPU usage (0.0 to 1.0)
- `getBatteryLevel(): Promise<number>` - Battery level (0.0 to 1.0)
- `getThermalState(): Promise<string>` - Device thermal state

### Utility Functions

- `isLowMemoryMode(): Promise<boolean>` - Check if device is in low memory mode
- `optimizeMemory(): Promise<void>` - Trigger memory optimization
- `getDevicePerformanceClass(): Promise<string>` - Get device performance class

## Architecture

This module uses JSI (JavaScript Interface) to provide direct access to native C++ functions, eliminating the overhead of the React Native bridge. The architecture consists of:

1. **C++ Core**: Platform-independent C++ implementation
2. **Platform Bindings**: Android (JNI) and iOS (Objective-C++) bindings
3. **JSI Interface**: Direct JavaScript-to-C++ function calls
4. **TypeScript Layer**: Type-safe JavaScript interface

## Performance Benefits

- **No Bridge Overhead**: Direct function calls eliminate async bridge communication
- **Synchronous Access**: Immediate response from native functions
- **Memory Efficient**: Reduced memory footprint compared to bridge-based modules
- **CPU Optimized**: Minimal CPU overhead for native operations

## Development

### Building from Source

1. Clone this repository
2. Run `npm install`
3. For Android: Build using Android Studio or `./gradlew build`
4. For iOS: Open `ios/GPUMemoryModule.xcworkspace` in Xcode

### Adding New Functions

1. Add function declaration to `cpp/GPUMemoryModule.h`
2. Implement function in `cpp/GPUMemoryModule.cpp`
3. Add JSI binding in `createGPUMemoryModule()` function
4. Update TypeScript interfaces in `js/GPUMemoryModule.ts`
5. Add platform-specific implementations for Android and iOS

## License

MIT License - see LICENSE file for details.

## Contributing

Pull requests are welcome! Please ensure:
- Code follows the existing style
- All functions have proper error handling
- TypeScript definitions are updated
- Platform-specific implementations are tested

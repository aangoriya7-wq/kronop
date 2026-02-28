import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  getGPUMemoryUsage, 
  getGPUMemoryTotal, 
  getSystemMemoryUsage, 
  getSystemMemoryTotal,
  getCPUUsage,
  isLowMemoryMode,
  getBatteryLevel,
  getThermalState,
  getDevicePerformanceClass
} from '../native-modules/GPUMemoryModule/js';

interface MemoryInfo {
  gpuUsage: number;
  gpuTotal: number;
  systemUsage: number;
  systemTotal: number;
  cpuUsage: number;
  batteryLevel: number;
  thermalState: string;
  performanceClass: string;
  isLowMemory: boolean;
}

export default function GPUMemoryExample() {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMemoryInfo = async () => {
    try {
      setLoading(true);
      const [
        gpuUsage,
        gpuTotal,
        systemUsage,
        systemTotal,
        cpuUsage,
        batteryLevel,
        thermalState,
        performanceClass,
        isLowMemory
      ] = await Promise.all([
        getGPUMemoryUsage(),
        getGPUMemoryTotal(),
        getSystemMemoryUsage(),
        getSystemMemoryTotal(),
        getCPUUsage(),
        getBatteryLevel(),
        getThermalState(),
        getDevicePerformanceClass(),
        isLowMemoryMode()
      ]);

      setMemoryInfo({
        gpuUsage,
        gpuTotal,
        systemUsage,
        systemTotal,
        cpuUsage,
        batteryLevel,
        thermalState,
        performanceClass,
        isLowMemory
      });

      if (isLowMemory) {
        Alert.alert('Low Memory Warning', 'Device is in low memory mode. Consider optimizing your app.');
      }
    } catch (error) {
      console.error('Error fetching memory info:', error);
      Alert.alert('Error', 'Failed to fetch memory information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemoryInfo();
    const interval = setInterval(fetchMemoryInfo, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading memory information...</Text>
      </View>
    );
  }

  if (!memoryInfo) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Failed to load memory information</Text>
      </View>
    );
  }

  const gpuUsagePercent = (memoryInfo.gpuUsage / memoryInfo.gpuTotal) * 100;
  const systemUsagePercent = (memoryInfo.systemUsage / memoryInfo.systemTotal) * 100;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>GPU & Memory Monitor</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>GPU Memory</Text>
        <Text style={styles.text}>Usage: {memoryInfo.gpuUsage.toFixed(1)} MB ({gpuUsagePercent.toFixed(1)}%)</Text>
        <Text style={styles.text}>Total: {memoryInfo.gpuTotal.toFixed(1)} MB</Text>
        <Text style={styles.text}>Available: {(memoryInfo.gpuTotal - memoryInfo.gpuUsage).toFixed(1)} MB</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Memory</Text>
        <Text style={styles.text}>Usage: {memoryInfo.systemUsage.toFixed(1)} MB ({systemUsagePercent.toFixed(1)}%)</Text>
        <Text style={styles.text}>Total: {memoryInfo.systemTotal.toFixed(1)} MB</Text>
        <Text style={styles.text}>Available: {(memoryInfo.systemTotal - memoryInfo.systemUsage).toFixed(1)} MB</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <Text style={styles.text}>CPU Usage: {(memoryInfo.cpuUsage * 100).toFixed(1)}%</Text>
        <Text style={styles.text}>Battery Level: {(memoryInfo.batteryLevel * 100).toFixed(0)}%</Text>
        <Text style={styles.text}>Thermal State: {memoryInfo.thermalState}</Text>
        <Text style={styles.text}>Performance Class: {memoryInfo.performanceClass}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Memory Status</Text>
        <Text style={[styles.text, memoryInfo.isLowMemory ? styles.warning : styles.normal]}>
          {memoryInfo.isLowMemory ? '⚠️ Low Memory Mode Active' : '✅ Memory Usage Normal'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  text: {
    fontSize: 16,
    marginVertical: 2,
    color: '#333',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
    color: 'red',
  },
  warning: {
    color: 'orange',
    fontWeight: 'bold',
  },
  normal: {
    color: 'green',
    fontWeight: 'bold',
  },
});

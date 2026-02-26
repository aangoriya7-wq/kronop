import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';

export default function BiometricScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasHardware, setHasHardware] = useState(false);
  const [supportedTypes, setSupportedTypes] = useState<number[]>([]);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      const hasHardwareSupport = await LocalAuthentication.hasHardwareAsync();
      const supportedBiometrics = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      setHasHardware(hasHardwareSupport);
      setSupportedTypes(supportedBiometrics);
      
      // Check if biometric was previously enabled
      const savedState = await LocalAuthentication.isEnrolledAsync();
      setBiometricEnabled(savedState);
    } catch (error) {
      console.error('Error checking biometric support:', error);
    }
  };

  const authenticateWithBiometric = async () => {
    if (!hasHardware) {
      Alert.alert('Error', 'Biometric authentication is not available on this device');
      return false;
    }

    try {
      setLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access the app',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });
      
      return result.success;
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', 'Failed to authenticate');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleBiometric = async () => {
    if (!biometricEnabled) {
      // Enable biometric - first authenticate the user
      const authenticated = await authenticateWithBiometric();
      if (authenticated) {
        setBiometricEnabled(true);
        Alert.alert('Success', 'Biometric authentication has been enabled for the app');
      }
    } else {
      // Disable biometric - first authenticate the user
      const authenticated = await authenticateWithBiometric();
      if (authenticated) {
        setBiometricEnabled(false);
        Alert.alert('Success', 'Biometric authentication has been disabled for the app');
      }
    }
  };

  const testBiometric = async () => {
    const authenticated = await authenticateWithBiometric();
    if (authenticated) {
      Alert.alert('Success', 'Biometric authentication is working correctly!');
    }
  };

  const getBiometricTypeText = () => {
    if (supportedTypes.includes(1)) { // FINGERPRINT = 1
      return 'Fingerprint';
    } else if (supportedTypes.includes(2)) { // FACIAL_RECOGNITION = 2
      return 'Face Recognition';
    } else if (supportedTypes.includes(3)) { // IRIS = 3
      return 'Iris Recognition';
    }
    return 'Biometric';
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Biometric Security</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Biometric Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="finger-print" size={48} color="#8B00FF" />
            <Text style={styles.cardTitle}>App Lock</Text>
          </View>
          
          <Text style={styles.cardDescription}>
            Enable biometric authentication to secure your entire app with {getBiometricTypeText()}
          </Text>

          {!hasHardware && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={20} color="#FF6B6B" />
              <Text style={styles.warningText}>
                Biometric authentication is not available on this device
              </Text>
            </View>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>
              {biometricEnabled ? 'Biometric Enabled' : 'Biometric Disabled'}
            </Text>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              disabled={!hasHardware || loading}
              trackColor={{ false: '#1A1A1A', true: '#8B00FF' }}
              thumbColor={biometricEnabled ? '#FFFFFF' : '#666666'}
            />
          </View>
        </View>

        {/* Test Authentication */}
        {biometricEnabled && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Test Authentication</Text>
            <Text style={styles.cardDescription}>
              Test your biometric authentication to ensure it's working properly
            </Text>
            
            <TouchableOpacity 
              style={[styles.testButton, loading && styles.disabledButton]}
              onPress={testBiometric}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="finger-print" size={20} color="#FFFFFF" />
                  <Text style={styles.testButtonText}>Test Biometric</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            • When enabled, the app will require biometric authentication every time you open it
          </Text>
          <Text style={styles.infoText}>
            • You can still disable it by authenticating first
          </Text>
          <Text style={styles.infoText}>
            • Your biometric data is stored securely by the device system
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 8,
    flex: 1,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B00FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: '#333333',
  },
  testButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#CCCCCC',
    lineHeight: 20,
    marginBottom: 8,
  },
});

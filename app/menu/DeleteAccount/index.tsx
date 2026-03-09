import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function DeleteAccount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = () => {
    if (!userId.trim()) {
      Alert.alert("Error", "Please enter your User ID");
      return;
    }

    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            checkEligibilityAndDelete();
          }
        }
      ]
    );
  };

  const checkEligibilityAndDelete = async () => {
    setLoading(true);
    
    try {
      // Simulate API call to check eligibility
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate eligibility check (example: user ID must be at least 6 characters)
      const isEligible = userId.length >= 6;
      
      if (isEligible) {
        Alert.alert(
          "Account Deleted",
          "Your account has been successfully deleted.",
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate to login screen or home
                router.replace('/(tabs)');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          "Not Eligible",
          "Your account is not eligible for deletion. Please contact support for more information."
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="delete" size={80} color="#FF4444" />
        </View>
        
        <Text style={styles.title}>Delete Account</Text>
        <Text style={styles.description}>
          Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.
        </Text>

        {/* User ID Input Section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Enter your User ID</Text>
          <TextInput
            style={styles.userIdInput}
            value={userId}
            onChangeText={setUserId}
            placeholder="Enter your User ID"
            placeholderTextColor="#666666"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.inputHint}>
            Enter your User ID to check if your account is eligible for deletion
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.deleteButton, loading && styles.disabledButton]} 
          onPress={handleDeleteAccount}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.deleteButtonText}>Checking...</Text>
          ) : (
            <>
              <MaterialIcons name="delete" size={20} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Delete Account</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={handleBack} disabled={loading}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  inputSection: {
    width: '100%',
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  userIdInput: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4444',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  disabledButton: {
    backgroundColor: '#666666',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cancelButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    width: '100%',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CCCCCC',
  },
});

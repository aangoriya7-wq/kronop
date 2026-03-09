import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BlockModal({ visible, onClose, username, onBlockConfirmed }) {
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    setLoading(true);
    try {
      // Simulate API call to block user
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const blockData = {
        blockedUser: username,
        timestamp: new Date().toISOString(),
        status: 'blocked'
      };
      
      console.log('User blocked:', blockData);
      
      // Here you would typically send this to your backend
      // await blockService.blockUser(blockData);
      
      Alert.alert(
        'User Blocked',
        `@${username} has been blocked successfully.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              onClose();
              if (onBlockConfirmed) {
                onBlockConfirmed(blockData);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to block user:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    setLoading(true);
    try {
      // Simulate API call to unblock user
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const unblockData = {
        unblockedUser: username,
        timestamp: new Date().toISOString(),
        status: 'unblocked'
      };
      
      console.log('User unblocked:', unblockData);
      
      Alert.alert(
        'User Unblocked',
        `@${username} has been unblocked successfully.`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              onClose();
              if (onBlockConfirmed) {
                onBlockConfirmed(unblockData);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to unblock user:', error);
      Alert.alert('Error', 'Failed to unblock user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Ionicons name="shield" size={32} color="#FF4444" />
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalTitle}>Block @{username}?</Text>
          
          <Text style={styles.modalMessage}>
            They will not be able to:
          </Text>
          
          <View style={styles.restrictionsList}>
            <View style={styles.restrictionItem}>
              <Ionicons name="close-circle" size={20} color="#FF4444" />
              <Text style={styles.restrictionText}>View your profile or posts</Text>
            </View>
            <View style={styles.restrictionItem}>
              <Ionicons name="close-circle" size={20} color="#FF4444" />
              <Text style={styles.restrictionText}>Follow or message you</Text>
            </View>
            <View style={styles.restrictionItem}>
              <Ionicons name="close-circle" size={20} color="#FF4444" />
              <Text style={styles.restrictionText}>See your comments or likes</Text>
            </View>
          </View>

          <Text style={styles.noteText}>
            They won't be notified that you've blocked them.
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B00FF" />
            </View>
          ) : (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.blockButton]}
                onPress={handleBlock}
              >
                <Text style={styles.blockButtonText}>Block User</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 16,
  },
  restrictionsList: {
    marginBottom: 20,
  },
  restrictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  restrictionText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  noteText: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 24,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#333333',
  },
  blockButton: {
    backgroundColor: '#FF4444',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  blockButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
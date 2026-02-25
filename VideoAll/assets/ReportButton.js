// Report button component for video player
// Report inappropriate content and feedback

import React, { useState } from 'react';
import { TouchableOpacity, Text, View, Modal, Alert, Picker } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const ReportButton = ({ 
  size = 24, 
  videoId, 
  style 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const reportReasons = [
    { id: 'inappropriate', label: 'Inappropriate Content', icon: '🚫' },
    { id: 'spam', label: 'Spam or Misleading', icon: '📧' },
    { id: 'copyright', label: 'Copyright Violation', icon: '©️' },
    { id: 'violence', label: 'Violent or Graphic', icon: '⚠️' },
    { id: 'harassment', label: 'Harassment', icon: '🚫' },
    { id: 'misinformation', label: 'False Information', icon: '❌' },
    { id: 'other', label: 'Other', icon: '⚙️' },
  ];
  
  const handlePress = () => {
    setModalVisible(true);
  };
  
  const submitReport = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for reporting');
      return;
    }
    
    if (selectedReason === 'other' && !customReason.trim()) {
      Alert.alert('Error', 'Please provide details for "Other" reason');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      const reportData = {
        videoId,
        reason: selectedReason,
        details: selectedReason === 'other' ? customReason : '',
        timestamp: new Date().toISOString(),
        userAgent: 'VideoPlayer App v1.0'
      };
      
      // In production, this would be an actual API call
      console.log('Submitting report:', reportData);
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. We\'ll review this content.',
        [
          { text: 'OK', onPress: () => {
            setModalVisible(false);
            setSelectedReason('');
            setCustomReason('');
            setIsSubmitting(false);
          }}
        ]
      );
      
    } catch (error) {
      console.error('Report submission error:', error);
      Alert.alert(
        'Error',
        'Failed to submit report. Please try again.',
        [
          { text: 'OK', onPress: () => setIsSubmitting(false) }
        ]
      );
    }
  };
  
  const renderReasonItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.reasonItem,
        selectedReason === item.id && styles.selectedReason
      ]}
      onPress={() => setSelectedReason(item.id)}
    >
      <Text style={styles.reasonIcon}>{item.icon}</Text>
      <Text style={styles.reasonLabel}>{item.label}</Text>
    </TouchableOpacity>
  );
  
  return (
    <>
      <TouchableOpacity 
        onPress={handlePress}
        style={[styles.container, style]}
        activeOpacity={0.8}
      >
        <Ionicons name="flag" size={size} color="#FFFFFF" />
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedReason('');
          setCustomReason('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Video</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.description}>
              Help us keep the community safe by reporting inappropriate content.
            </Text>
            
            {/* Report reasons */}
            <View style={styles.reasonsContainer}>
              <FlatList
                data={reportReasons}
                renderItem={renderReasonItem}
                keyExtractor={item => item.id}
                style={styles.reasonsList}
              />
            </View>
            
            {/* Custom reason input */}
            {selectedReason === 'other' && (
              <View style={styles.customReasonContainer}>
                <Text style={styles.customReasonLabel}>Please provide details:</Text>
                <TextInput
                  style={styles.customReasonInput}
                  value={customReason}
                  onChangeText={setCustomReason}
                  placeholder="Describe the issue..."
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
              </View>
            )}
            
            {/* Submit button */}
            <TouchableOpacity 
              style={[
                styles.submitButton,
                (!selectedReason || (selectedReason === 'other' && !customReason.trim())) && styles.disabledButton
              ]}
              onPress={submitReport}
              disabled={isSubmitting || !selectedReason || (selectedReason === 'other' && !customReason.trim())}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = {
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  reasonsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reasonsList: {
    marginBottom: 20,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    margin: 5,
    backgroundColor: '#F8F8F8',
  },
  selectedReason: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FF',
  },
  reasonIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  customReasonContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  customReasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 10,
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 14,
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#FF3B5C',
    borderRadius: 10,
    paddingVertical: 15,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
};

export default ReportButton;

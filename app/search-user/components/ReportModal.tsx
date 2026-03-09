import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const reportReasons = [
  { id: 'spam', label: 'Spam or misleading' },
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate_speech', label: 'Hate speech' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'violence', label: 'Violence or dangerous content' },
  { id: 'fake_account', label: 'Fake account' },
  { id: 'intellectual_property', label: 'Intellectual property violation' },
  { id: 'other', label: 'Other issue' },
];

export default function ReportModal({ visible, onClose, username, onReportSubmitted }) {
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('reasons'); // reasons, custom, submitted

  const handleReasonSelect = (reason) => {
    setSelectedReason(reason);
    if (reason.id === 'other') {
      setStep('custom');
    } else {
      submitReport(reason);
    }
  };

  const submitReport = async (reason) => {
    setLoading(true);
    try {
      // Simulate API call to report user
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const reportData = {
        reportedUser: username,
        reason: reason.id,
        customReason: reason.id === 'other' ? customReason : null,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      console.log('Report submitted:', reportData);
      
      // Here you would typically send this to your backend
      // await reportService.submitReport(reportData);
      
      setStep('submitted');
      
      if (onReportSubmitted) {
        onReportSubmitted(reportData);
      }
    } catch (error) {
      console.error('Failed to submit report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = () => {
    if (!customReason.trim()) {
      Alert.alert('Error', 'Please provide a reason');
      return;
    }
    submitReport({ id: 'other' });
  };

  const handleClose = () => {
    setSelectedReason(null);
    setCustomReason('');
    setStep('reasons');
    onClose();
  };

  const handleDone = () => {
    handleClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {step === 'submitted' ? 'Report Submitted' : 'Report User'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B00FF" />
              <Text style={styles.loadingText}>Submitting report...</Text>
            </View>
          ) : (
            <>
              {step === 'reasons' && (
                <>
                  <Text style={styles.reportingUser}>
                    Reporting: <Text style={styles.usernameHighlight}>@{username}</Text>
                  </Text>
                  <Text style={styles.reasonPrompt}>
                    Please select a reason for reporting this user:
                  </Text>
                  
                  <ScrollView style={styles.reasonsList}>
                    {reportReasons.map((reason) => (
                      <TouchableOpacity
                        key={reason.id}
                        style={styles.reasonItem}
                        onPress={() => handleReasonSelect(reason)}
                      >
                        <Text style={styles.reasonText}>{reason.label}</Text>
                        <Ionicons name="chevron-forward" size={20} color="#666666" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {step === 'custom' && (
                <View style={styles.customContainer}>
                  <Text style={styles.customPrompt}>
                    Please provide more details about the issue:
                  </Text>
                  <TextInput
                    style={styles.customInput}
                    multiline
                    numberOfLines={5}
                    value={customReason}
                    onChangeText={setCustomReason}
                    placeholder="Describe the issue..."
                    placeholderTextColor="#666666"
                    textAlignVertical="top"
                  />
                  <View style={styles.customButtons}>
                    <TouchableOpacity
                      style={[styles.customButton, styles.cancelCustomButton]}
                      onPress={() => setStep('reasons')}
                    >
                      <Text style={styles.cancelCustomText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.customButton, styles.submitCustomButton]}
                      onPress={handleCustomSubmit}
                    >
                      <Text style={styles.submitCustomText}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {step === 'submitted' && (
                <View style={styles.submittedContainer}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
                  </View>
                  <Text style={styles.submittedTitle}>Thank You</Text>
                  <Text style={styles.submittedMessage}>
                    Your report has been submitted successfully. Our team will review it and take appropriate action.
                  </Text>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={handleDone}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
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
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 14,
  },
  reportingUser: {
    color: '#CCCCCC',
    fontSize: 14,
    padding: 16,
    paddingBottom: 8,
  },
  usernameHighlight: {
    color: '#8B00FF',
    fontWeight: '600',
  },
  reasonPrompt: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  reasonsList: {
    maxHeight: 400,
  },
  reasonItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  reasonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  customContainer: {
    padding: 16,
  },
  customPrompt: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 12,
  },
  customInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 100,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  customButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  customButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelCustomButton: {
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#8B00FF',
  },
  submitCustomButton: {
    backgroundColor: '#8B00FF',
  },
  cancelCustomText: {
    color: '#8B00FF',
    fontSize: 14,
    fontWeight: '600',
  },
  submitCustomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  submittedContainer: {
    padding: 32,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 20,
  },
  submittedTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  submittedMessage: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: '#8B00FF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeScreen } from '../components/layout/SafeScreen';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../constants/theme';

export default function VerificationScreen() {
  const router = useRouter();

  return (
    <SafeScreen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Verification Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="verified" size={80} color="#8B00FF" />
          </View>
          
          <Text style={styles.title}>Get Verified</Text>
          <Text style={styles.description}>
            Verify your account to get the verified badge and unlock exclusive features. 
            This helps us ensure the authenticity of our community.
          </Text>

          {/* Verification Steps */}
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Complete Profile</Text>
                <Text style={styles.stepDescription}>Fill out your complete profile information</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Verify Identity</Text>
                <Text style={styles.stepDescription}>Submit government-issued ID for verification</Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Wait for Review</Text>
                <Text style={styles.stepDescription}>Our team will review your application</Text>
              </View>
            </View>
          </View>

          {/* Start Verification Button */}
          <TouchableOpacity style={styles.startButton}>
            <Text style={styles.startButtonText}>Start Verification</Text>
          </TouchableOpacity>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>Benefits of Verification</Text>
            <View style={styles.benefit}>
              <MaterialIcons name="check-circle" size={20} color="#8B00FF" />
              <Text style={styles.benefitText}>Verified badge on your profile</Text>
            </View>
            <View style={styles.benefit}>
              <MaterialIcons name="check-circle" size={20} color="#8B00FF" />
              <Text style={styles.benefitText}>Increased visibility in search</Text>
            </View>
            <View style={styles.benefit}>
              <MaterialIcons name="check-circle" size={20} color="#8B00FF" />
              <Text style={styles.benefitText}>Access to exclusive features</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background.secondary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  placeholder: {
    width: 24,
  },
  content: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  stepsContainer: {
    marginBottom: 32,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B00FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: '#8B00FF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  benefitsContainer: {
    backgroundColor: theme.colors.background.secondary,
    padding: 20,
    borderRadius: 12,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginLeft: 12,
  },
});

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAlert, useAuth } from '../template';
import { theme } from '../constants/theme';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { API_BASE_URL } from '../constants/network';

const API_URL = API_BASE_URL;

const COUNTRIES = [
  'United States', 'India', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Japan', 'China', 'Brazil', 'Mexico', 'Italy',
  'Spain', 'South Korea', 'Russia', 'Indonesia', 'Turkey', 'Netherlands',
  'Saudi Arabia', 'Switzerland', 'Other'
];

const GENDERS = [
  { value: 'male', label: 'Male', icon: 'man' },
  { value: 'female', label: 'Female', icon: 'woman' },
  { value: 'other', label: 'Other', icon: 'person' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: 'help' },
];

export default function OnboardingScreen() {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const router = useRouter();
  

  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      showAlert('Permission Required', 'Please grant photo library access to upload profile picture');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUrl(result.assets[0].uri);
    }
  };

  const handleGetCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      showAlert('Permission Required', 'Please grant location access to get current address');
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({});
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResult) {
        const fullAddress = [
          addressResult.street,
          addressResult.city,
          addressResult.region,
          addressResult.postalCode,
        ].filter(Boolean).join(', ');
        
        setAddress(fullAddress);
        if (addressResult.country) {
          setCountry(addressResult.country);
        }
        showAlert('Success', 'Address updated from current location');
      }
    } catch (error) {
      showAlert('Error', 'Could not get current location');
    }
  };

  const validateForm = () => {
    if (!username.trim()) {
      showAlert('Error', 'Please enter username');
      return false;
    }

    if (!phoneNumber.trim()) {
      showAlert('Error', 'Please enter phone number');
      return false;
    }

    if (!dateOfBirth) {
      showAlert('Error', 'Please enter date of birth (DD/MM/YYYY)');
      return false;
    }

    // Validate date format
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateOfBirth)) {
      showAlert('Error', 'Please enter date in DD/MM/YYYY format');
      return false;
    }

    if (!gender) {
      showAlert('Error', 'Please select gender');
      return false;
    }

    if (!address.trim()) {
      showAlert('Error', 'Please enter address');
      return false;
    }

    if (!country) {
      showAlert('Error', 'Please select country');
      return false;
    }

    return true;
  };

  const handleComplete = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Convert DD/MM/YYYY to YYYY-MM-DD
      const [day, month, year] = dateOfBirth.split('/');
      const formattedDate = `${year}-${month}-${day}`;

      await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user?.id,
          username,
          phone_number: phoneNumber,
          date_of_birth: formattedDate,
          gender,
          address,
          country,
          avatar_url: avatarUrl || null,
          profile_completed: true,
        })
      }).catch(() => {});

      showAlert('Success', 'Profile setup completed!');
      router.replace('/(tabs)');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Tell us more about yourself</Text>
        </View>

        {/* Avatar Upload */}
        <TouchableOpacity style={styles.avatarSection} onPress={handlePickImage} activeOpacity={0.7}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="add-a-photo" size={40} color={theme.colors.text.tertiary} />
            </View>
          )}
          <Text style={styles.avatarLabel}>Upload Profile Photo</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username *</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="person" size={24} color={theme.colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Choose username"
                placeholderTextColor={theme.colors.text.tertiary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="phone" size={24} color={theme.colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+1 234 567 8900"
                placeholderTextColor={theme.colors.text.tertiary}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Date of Birth */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth *</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="cake" size={24} color={theme.colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={theme.colors.text.tertiary}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender *</Text>
            {showGenderPicker ? (
              <View style={styles.pickerContainer}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.pickerItem, gender === g.value && styles.pickerItemActive]}
                    onPress={() => {
                      setGender(g.value);
                      setShowGenderPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name={g.icon as any} size={24} color={gender === g.value ? theme.colors.primary.main : theme.colors.text.secondary} />
                    <Text style={[styles.pickerItemText, gender === g.value && styles.pickerItemTextActive]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowGenderPicker(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="wc" size={24} color={theme.colors.text.tertiary} style={styles.inputIcon} />
                <Text style={[styles.input, !gender && styles.placeholder]}>
                  {gender ? GENDERS.find(g => g.value === gender)?.label : 'Select gender'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Address *</Text>
              <TouchableOpacity onPress={handleGetCurrentLocation} activeOpacity={0.7}>
                <MaterialIcons name="my-location" size={20} color={theme.colors.primary.main} />
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <MaterialIcons name="location-on" size={24} color={theme.colors.text.tertiary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your address"
                placeholderTextColor={theme.colors.text.tertiary}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={2}
              />
            </View>
          </View>

          {/* Country */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country *</Text>
            {showCountryPicker ? (
              <ScrollView style={styles.countryPickerScroll} nestedScrollEnabled>
                {COUNTRIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.countryItem, country === c && styles.countryItemActive]}
                    onPress={() => {
                      setCountry(c);
                      setShowCountryPicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.countryItemText, country === c && styles.countryItemTextActive]}>{c}</Text>
                    {country === c && <MaterialIcons name="check" size={20} color={theme.colors.primary.main} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowCountryPicker(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons name="flag" size={24} color={theme.colors.text.tertiary} style={styles.inputIcon} />
                <Text style={[styles.input, !country && styles.placeholder]}>
                  {country || 'Select country'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.completeButton, loading && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.completeButtonText}>
            {loading ? 'Saving...' : 'Complete Profile'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)')}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  scrollContent: {
    padding: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.xxxl,
  },
  title: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background.secondary,
    borderWidth: 2,
    borderColor: theme.colors.border.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  form: {
    gap: theme.spacing.lg,
  },
  inputGroup: {
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    paddingHorizontal: theme.spacing.md,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
    padding: 0,
  },
  textArea: {
    paddingVertical: theme.spacing.md,
    textAlignVertical: 'top',
  },
  placeholder: {
    color: theme.colors.text.tertiary,
  },
  pickerContainer: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
    padding: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  pickerItemActive: {
    backgroundColor: theme.colors.background.tertiary,
  },
  pickerItemText: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.md,
  },
  pickerItemTextActive: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  countryPickerScroll: {
    maxHeight: 300,
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.primary,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  countryItemActive: {
    backgroundColor: theme.colors.background.tertiary,
  },
  countryItemText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
  },
  countryItemTextActive: {
    color: theme.colors.primary.main,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  completeButton: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.borderRadius.lg,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  skipButton: {
    alignItems: 'center',
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  skipButtonText: {
    color: theme.colors.text.tertiary,
    fontSize: theme.typography.fontSize.md,
  },
});

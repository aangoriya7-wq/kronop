import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

interface BankDetails {
  // Step 1: Basic Information
  fullName: string;
  dateOfBirth: string;
  mobileNumber: string;
  email: string;
  alternateMobile: string;
  gender: 'male' | 'female' | 'other';
  maritalStatus: 'single' | 'married' | 'other';
  occupation: string;
  annualIncome: string;
  
  // Step 2: Address Details
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  residenceType: 'owned' | 'rented' | 'parental';
  yearsAtAddress: string;
  
  // Step 3: Bank Account Details
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  accountType: 'savings' | 'current' | 'other';
  upiId: string;
  
  // Step 4: KYC Documents
  panCard: string;
  aadhaarNumber: string;
  passportNumber: string;
  drivingLicense: string;
  voterId: string;
  
  // Step 5: Nominee Details
  nomineeName: string;
  nomineeRelation: string;
  nomineeDateOfBirth: string;
  nomineePhone: string;
  nomineePercentage: string;
}

export default function AddBankAccountScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    // Step 1: Basic Information
    fullName: '',
    dateOfBirth: '',
    mobileNumber: '',
    email: '',
    alternateMobile: '',
    gender: 'male',
    maritalStatus: 'single',
    occupation: '',
    annualIncome: '',
    
    // Step 2: Address Details
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    residenceType: 'owned',
    yearsAtAddress: '',
    
    // Step 3: Bank Account Details
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    accountType: 'savings',
    upiId: '',
    
    // Step 4: KYC Documents
    panCard: '',
    aadhaarNumber: '',
    passportNumber: '',
    drivingLicense: '',
    voterId: '',
    
    // Step 5: Nominee Details
    nomineeName: '',
    nomineeRelation: '',
    nomineeDateOfBirth: '',
    nomineePhone: '',
    nomineePercentage: '',
  });

  const [errors, setErrors] = useState<Partial<BankDetails>>({});

  // Validation Functions
  const validateStep1 = () => {
    const newErrors: Partial<BankDetails> = {};

    if (!bankDetails.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!bankDetails.dateOfBirth.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(bankDetails.dateOfBirth)) {
      newErrors.dateOfBirth = 'Use DD/MM/YYYY format';
    }

    if (!bankDetails.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(bankDetails.mobileNumber)) {
      newErrors.mobileNumber = 'Enter valid 10-digit mobile number';
    }

    if (bankDetails.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bankDetails.email)) {
      newErrors.email = 'Enter valid email address';
    }

    if (bankDetails.alternateMobile && !/^[0-9]{10}$/.test(bankDetails.alternateMobile)) {
      newErrors.alternateMobile = 'Enter valid 10-digit mobile number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Partial<BankDetails> = {};

    if (!bankDetails.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address is required';
    }

    if (!bankDetails.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!bankDetails.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!bankDetails.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!/^[0-9]{6}$/.test(bankDetails.pincode)) {
      newErrors.pincode = 'Enter valid 6-digit pincode';
    }

    if (!bankDetails.yearsAtAddress.trim()) {
      newErrors.yearsAtAddress = 'Years at address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Partial<BankDetails> = {};

    if (!bankDetails.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    if (!bankDetails.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (bankDetails.accountNumber.length < 9 || bankDetails.accountNumber.length > 18) {
      newErrors.accountNumber = 'Account number should be 9-18 digits';
    }

    if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
    }

    if (!bankDetails.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode)) {
      newErrors.ifscCode = 'Invalid IFSC code format';
    }

    if (!bankDetails.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!bankDetails.branchName.trim()) {
      newErrors.branchName = 'Branch name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = () => {
    const newErrors: Partial<BankDetails> = {};

    if (!bankDetails.panCard.trim()) {
      newErrors.panCard = 'PAN card is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(bankDetails.panCard)) {
      newErrors.panCard = 'Invalid PAN card format';
    }

    if (!bankDetails.aadhaarNumber.trim()) {
      newErrors.aadhaarNumber = 'Aadhaar number is required';
    } else if (!/^[0-9]{12}$/.test(bankDetails.aadhaarNumber)) {
      newErrors.aadhaarNumber = 'Enter valid 12-digit Aadhaar number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep5 = () => {
    const newErrors: Partial<BankDetails> = {};

    if (!bankDetails.nomineeName.trim()) {
      newErrors.nomineeName = 'Nominee name is required';
    }

    if (!bankDetails.nomineeRelation.trim()) {
      newErrors.nomineeRelation = 'Relation with nominee is required';
    }

    if (!bankDetails.nomineeDateOfBirth.trim()) {
      newErrors.nomineeDateOfBirth = 'Nominee date of birth is required';
    }

    if (!bankDetails.nomineePhone.trim()) {
      newErrors.nomineePhone = 'Nominee phone is required';
    } else if (!/^[0-9]{10}$/.test(bankDetails.nomineePhone)) {
      newErrors.nomineePhone = 'Enter valid 10-digit mobile number';
    }

    if (!bankDetails.nomineePercentage.trim()) {
      newErrors.nomineePercentage = 'Nominee percentage is required';
    } else {
      const percent = parseInt(bankDetails.nomineePercentage);
      if (percent < 1 || percent > 100) {
        newErrors.nomineePercentage = 'Percentage should be between 1-100';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    } else if (step === 4 && validateStep4()) {
      setStep(5);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleSubmit = () => {
    if (validateStep5()) {
      Alert.alert(
        "Success",
        "Your bank account has been added successfully!\n\nAll details have been verified.",
        [
          { 
            text: "OK", 
            onPress: () => router.back() 
          }
        ]
      );
      console.log('Complete Bank Details:', bankDetails);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5].map((num) => (
        <React.Fragment key={num}>
          <View style={[styles.step, step >= num && styles.activeStep]}>
            <Text style={[styles.stepText, step >= num && styles.activeStepText]}>{num}</Text>
          </View>
          {num < 5 && <View style={[styles.stepLine, step > num && styles.activeStepLine]} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>📋 Basic Information</Text>
      <Text style={styles.sectionSubtitle}>Please provide your personal details</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Full Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.fullName && styles.inputError]}
          placeholder="Enter your full name as per bank records"
          placeholderTextColor="#666"
          value={bankDetails.fullName}
          onChangeText={(text) => setBankDetails({...bankDetails, fullName: text})}
        />
        {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.dateOfBirth && styles.inputError]}
          placeholder="DD/MM/YYYY"
          placeholderTextColor="#666"
          value={bankDetails.dateOfBirth}
          onChangeText={(text) => setBankDetails({...bankDetails, dateOfBirth: text})}
        />
        {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
        <Text style={styles.hintText}>Format: 15/05/1990</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Mobile Number <Text style={styles.required}>*</Text></Text>
        <View style={styles.phoneInput}>
          <Text style={styles.countryCode}>+91</Text>
          <TextInput
            style={[styles.phoneField, errors.mobileNumber && styles.inputError]}
            placeholder="Enter 10-digit mobile"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            maxLength={10}
            value={bankDetails.mobileNumber}
            onChangeText={(text) => setBankDetails({...bankDetails, mobileNumber: text})}
          />
        </View>
        {errors.mobileNumber && <Text style={styles.errorText}>{errors.mobileNumber}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email ID</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Enter your email address"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
          value={bankDetails.email}
          onChangeText={(text) => setBankDetails({...bankDetails, email: text})}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Alternate Mobile Number (Optional)</Text>
        <View style={styles.phoneInput}>
          <Text style={styles.countryCode}>+91</Text>
          <TextInput
            style={[styles.phoneField, errors.alternateMobile && styles.inputError]}
            placeholder="Alternate contact number"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
            maxLength={10}
            value={bankDetails.alternateMobile}
            onChangeText={(text) => setBankDetails({...bankDetails, alternateMobile: text})}
          />
        </View>
        {errors.alternateMobile && <Text style={styles.errorText}>{errors.alternateMobile}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.radioGroup}>
          {['male', 'female', 'other'].map((gender) => (
            <TouchableOpacity 
              key={gender}
              style={styles.radioOption}
              onPress={() => setBankDetails({...bankDetails, gender: gender as any})}
            >
              <View style={[styles.radioCircle, bankDetails.gender === gender && styles.selectedRadio]}>
                {bankDetails.gender === gender && <View style={styles.selectedRadioInner} />}
              </View>
              <Text style={styles.radioLabel}>{gender.charAt(0).toUpperCase() + gender.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfContainer}>
          <Text style={styles.label}>Marital Status</Text>
          <View style={styles.pickerContainer}>
            {['single', 'married', 'other'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.pickerOption,
                  bankDetails.maritalStatus === status && styles.selectedPicker
                ]}
                onPress={() => setBankDetails({...bankDetails, maritalStatus: status as any})}
              >
                <Text style={[
                  styles.pickerText,
                  bankDetails.maritalStatus === status && styles.selectedPickerText
                ]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.halfContainer}>
          <Text style={styles.label}>Occupation</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Salaried, Business"
            placeholderTextColor="#666"
            value={bankDetails.occupation}
            onChangeText={(text) => setBankDetails({...bankDetails, occupation: text})}
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Annual Income</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., 5 Lakhs, 10 Lakhs"
          placeholderTextColor="#666"
          value={bankDetails.annualIncome}
          onChangeText={(text) => setBankDetails({...bankDetails, annualIncome: text})}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>🏠 Address Details</Text>
      <Text style={styles.sectionSubtitle}>Please provide your current residential address</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address Line 1 <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.addressLine1 && styles.inputError]}
          placeholder="House/Flat No., Building Name"
          placeholderTextColor="#666"
          value={bankDetails.addressLine1}
          onChangeText={(text) => setBankDetails({...bankDetails, addressLine1: text})}
        />
        {errors.addressLine1 && <Text style={styles.errorText}>{errors.addressLine1}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Address Line 2 (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Street, Area, Landmark"
          placeholderTextColor="#666"
          value={bankDetails.addressLine2}
          onChangeText={(text) => setBankDetails({...bankDetails, addressLine2: text})}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfContainer}>
          <Text style={styles.label}>City <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.city && styles.inputError]}
            placeholder="Enter city"
            placeholderTextColor="#666"
            value={bankDetails.city}
            onChangeText={(text) => setBankDetails({...bankDetails, city: text})}
          />
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
        </View>

        <View style={styles.halfContainer}>
          <Text style={styles.label}>State <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.state && styles.inputError]}
            placeholder="Enter state"
            placeholderTextColor="#666"
            value={bankDetails.state}
            onChangeText={(text) => setBankDetails({...bankDetails, state: text})}
          />
          {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfContainer}>
          <Text style={styles.label}>Pincode <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.pincode && styles.inputError]}
            placeholder="6-digit pincode"
            placeholderTextColor="#666"
            keyboardType="numeric"
            maxLength={6}
            value={bankDetails.pincode}
            onChangeText={(text) => setBankDetails({...bankDetails, pincode: text})}
          />
          {errors.pincode && <Text style={styles.errorText}>{errors.pincode}</Text>}
        </View>

        <View style={styles.halfContainer}>
          <Text style={styles.label}>Country</Text>
          <TextInput
            style={styles.input}
            value="India"
            editable={false}
            placeholderTextColor="#666"
          />
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Residence Type</Text>
        <View style={styles.pickerContainer}>
          {['owned', 'rented', 'parental'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.pickerOption,
                bankDetails.residenceType === type && styles.selectedPicker
              ]}
              onPress={() => setBankDetails({...bankDetails, residenceType: type as any})}
            >
              <Text style={[
                styles.pickerText,
                bankDetails.residenceType === type && styles.selectedPickerText
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Years at this Address <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.yearsAtAddress && styles.inputError]}
          placeholder="e.g., 2 years, 5 years"
          placeholderTextColor="#666"
          value={bankDetails.yearsAtAddress}
          onChangeText={(text) => setBankDetails({...bankDetails, yearsAtAddress: text})}
        />
        {errors.yearsAtAddress && <Text style={styles.errorText}>{errors.yearsAtAddress}</Text>}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>🏦 Bank Account Details</Text>
      <Text style={styles.sectionSubtitle}>Enter your bank account information</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Account Holder Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.accountHolderName && styles.inputError]}
          placeholder="Name as per bank records"
          placeholderTextColor="#666"
          value={bankDetails.accountHolderName}
          onChangeText={(text) => setBankDetails({...bankDetails, accountHolderName: text})}
        />
        {errors.accountHolderName && <Text style={styles.errorText}>{errors.accountHolderName}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Account Number <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.accountNumber && styles.inputError]}
          placeholder="Enter account number"
          placeholderTextColor="#666"
          keyboardType="numeric"
          value={bankDetails.accountNumber}
          onChangeText={(text) => setBankDetails({...bankDetails, accountNumber: text})}
        />
        {errors.accountNumber && <Text style={styles.errorText}>{errors.accountNumber}</Text>}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Account Number <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.confirmAccountNumber && styles.inputError]}
          placeholder="Re-enter account number"
          placeholderTextColor="#666"
          keyboardType="numeric"
          value={bankDetails.confirmAccountNumber}
          onChangeText={(text) => setBankDetails({...bankDetails, confirmAccountNumber: text})}
        />
        {errors.confirmAccountNumber && <Text style={styles.errorText}>{errors.confirmAccountNumber}</Text>}
      </View>

      <View style={styles.row}>
        <View style={styles.halfContainer}>
          <Text style={styles.label}>IFSC Code <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.ifscCode && styles.inputError]}
            placeholder="e.g., SBIN0001234"
            placeholderTextColor="#666"
            autoCapitalize="characters"
            value={bankDetails.ifscCode}
            onChangeText={(text) => setBankDetails({...bankDetails, ifscCode: text.toUpperCase()})}
          />
          {errors.ifscCode && <Text style={styles.errorText}>{errors.ifscCode}</Text>}
        </View>

        <View style={styles.halfContainer}>
          <Text style={styles.label}>Bank Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.bankName && styles.inputError]}
            placeholder="Enter bank name"
            placeholderTextColor="#666"
            value={bankDetails.bankName}
            onChangeText={(text) => setBankDetails({...bankDetails, bankName: text})}
          />
          {errors.bankName && <Text style={styles.errorText}>{errors.bankName}</Text>}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfContainer}>
          <Text style={styles.label}>Branch Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.branchName && styles.inputError]}
            placeholder="Enter branch name"
            placeholderTextColor="#666"
            value={bankDetails.branchName}
            onChangeText={(text) => setBankDetails({...bankDetails, branchName: text})}
          />
          {errors.branchName && <Text style={styles.errorText}>{errors.branchName}</Text>}
        </View>

        <View style={styles.halfContainer}>
          <Text style={styles.label}>Account Type</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setBankDetails({...bankDetails, accountType: 'savings'})}
            >
              <View style={[styles.radioCircle, bankDetails.accountType === 'savings' && styles.selectedRadio]}>
                {bankDetails.accountType === 'savings' && <View style={styles.selectedRadioInner} />}
              </View>
              <Text style={styles.radioLabel}>Savings</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setBankDetails({...bankDetails, accountType: 'current'})}
            >
              <View style={[styles.radioCircle, bankDetails.accountType === 'current' && styles.selectedRadio]}>
                {bankDetails.accountType === 'current' && <View style={styles.selectedRadioInner} />}
              </View>
              <Text style={styles.radioLabel}>Current</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>UPI ID (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., name@bank"
          placeholderTextColor="#666"
          value={bankDetails.upiId}
          onChangeText={(text) => setBankDetails({...bankDetails, upiId: text})}
        />
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>🪪 KYC Documents</Text>
      <Text style={styles.sectionSubtitle}>Upload your identity proofs (at least PAN & Aadhaar)</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>PAN Card <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.panCard && styles.inputError]}
          placeholder="e.g., ABCDE1234F"
          placeholderTextColor="#666"
          autoCapitalize="characters"
          maxLength={10}
          value={bankDetails.panCard}
          onChangeText={(text) => setBankDetails({...bankDetails, panCard: text.toUpperCase()})}
        />
        {errors.panCard && <Text style={styles.errorText}>{errors.panCard}</Text>}
        <Text style={styles.hintText}>Format: ABCDE1234F (10 characters)</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Aadhaar Number <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.aadhaarNumber && styles.inputError]}
          placeholder="Enter 12-digit Aadhaar number"
          placeholderTextColor="#666"
          keyboardType="numeric"
          maxLength={12}
          value={bankDetails.aadhaarNumber}
          onChangeText={(text) => setBankDetails({...bankDetails, aadhaarNumber: text})}
        />
        {errors.aadhaarNumber && <Text style={styles.errorText}>{errors.aadhaarNumber}</Text>}
        <Text style={styles.hintText}>Format: 1234 5678 9012 (12 digits)</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Passport Number (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., A1234567"
          placeholderTextColor="#666"
          autoCapitalize="characters"
          value={bankDetails.passportNumber}
          onChangeText={(text) => setBankDetails({...bankDetails, passportNumber: text.toUpperCase()})}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfContainer}>
          <Text style={styles.label}>Driving License (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="License number"
            placeholderTextColor="#666"
            autoCapitalize="characters"
            value={bankDetails.drivingLicense}
            onChangeText={(text) => setBankDetails({...bankDetails, drivingLicense: text.toUpperCase()})}
          />
        </View>

        <View style={styles.halfContainer}>
          <Text style={styles.label}>Voter ID (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Voter ID number"
            placeholderTextColor="#666"
            autoCapitalize="characters"
            value={bankDetails.voterId}
            onChangeText={(text) => setBankDetails({...bankDetails, voterId: text.toUpperCase()})}
          />
        </View>
      </View>

      <View style={styles.kycNote}>
        <MaterialIcons name="info" size={20} color="#8B00FF" />
        <Text style={styles.kycNoteText}>
          Your documents are secure and encrypted. We use them only for verification purposes as per RBI guidelines.
        </Text>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>👥 Nominee Details</Text>
      <Text style={styles.sectionSubtitle}>Add nominee for your account (optional but recommended)</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Nominee Full Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, errors.nomineeName && styles.inputError]}
          placeholder="Enter nominee's full name"
          placeholderTextColor="#666"
          value={bankDetails.nomineeName}
          onChangeText={(text) => setBankDetails({...bankDetails, nomineeName: text})}
        />
        {errors.nomineeName && <Text style={styles.errorText}>{errors.nomineeName}</Text>}
      </View>

      <View style={styles.row}>
        <View style={styles.halfContainer}>
          <Text style={styles.label}>Relation <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.nomineeRelation && styles.inputError]}
            placeholder="e.g., Spouse, Son, Daughter"
            placeholderTextColor="#666"
            value={bankDetails.nomineeRelation}
            onChangeText={(text) => setBankDetails({...bankDetails, nomineeRelation: text})}
          />
          {errors.nomineeRelation && <Text style={styles.errorText}>{errors.nomineeRelation}</Text>}
        </View>

        <View style={styles.halfContainer}>
          <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.nomineeDateOfBirth && styles.inputError]}
            placeholder="DD/MM/YYYY"
            placeholderTextColor="#666"
            value={bankDetails.nomineeDateOfBirth}
            onChangeText={(text) => setBankDetails({...bankDetails, nomineeDateOfBirth: text})}
          />
          {errors.nomineeDateOfBirth && <Text style={styles.errorText}>{errors.nomineeDateOfBirth}</Text>}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfContainer}>
          <Text style={styles.label}>Phone Number <Text style={styles.required}>*</Text></Text>
          <View style={styles.phoneInput}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={[styles.phoneField, errors.nomineePhone && styles.inputError]}
              placeholder="10-digit mobile"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
              maxLength={10}
              value={bankDetails.nomineePhone}
              onChangeText={(text) => setBankDetails({...bankDetails, nomineePhone: text})}
            />
          </View>
          {errors.nomineePhone && <Text style={styles.errorText}>{errors.nomineePhone}</Text>}
        </View>

        <View style={styles.halfContainer}>
          <Text style={styles.label}>Allocation % <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.nomineePercentage && styles.inputError]}
            placeholder="1-100%"
            placeholderTextColor="#666"
            keyboardType="numeric"
            maxLength={3}
            value={bankDetails.nomineePercentage}
            onChangeText={(text) => setBankDetails({...bankDetails, nomineePercentage: text})}
          />
          {errors.nomineePercentage && <Text style={styles.errorText}>{errors.nomineePercentage}</Text>}
        </View>
      </View>

      <View style={styles.nomineeNote}>
        <Ionicons name="heart" size={20} color="#FF6B6B" />
        <Text style={styles.nomineeNoteText}>
          You can add multiple nominees. Total allocation should not exceed 100%.
        </Text>
      </View>

      {/* Summary of all details */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>📝 Complete Summary</Text>
        
        <Text style={styles.summarySection}>Basic Information:</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name:</Text>
          <Text style={styles.summaryValue}>{bankDetails.fullName}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>DOB:</Text>
          <Text style={styles.summaryValue}>{bankDetails.dateOfBirth}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Mobile:</Text>
          <Text style={styles.summaryValue}>+91 {bankDetails.mobileNumber}</Text>
        </View>
        
        <Text style={[styles.summarySection, {marginTop: 12}]}>Address:</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>City:</Text>
          <Text style={styles.summaryValue}>{bankDetails.city}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Pincode:</Text>
          <Text style={styles.summaryValue}>{bankDetails.pincode}</Text>
        </View>
        
        <Text style={[styles.summarySection, {marginTop: 12}]}>Bank Account:</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Account:</Text>
          <Text style={styles.summaryValue}>XXXX{bankDetails.accountNumber.slice(-4)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>IFSC:</Text>
          <Text style={styles.summaryValue}>{bankDetails.ifscCode}</Text>
        </View>
        
        <Text style={[styles.summarySection, {marginTop: 12}]}>Nominee:</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name:</Text>
          <Text style={styles.summaryValue}>{bankDetails.nomineeName || '—'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Allocation:</Text>
          <Text style={styles.summaryValue}>{bankDetails.nomineePercentage || '—'}%</Text>
        </View>
      </View>

      <View style={styles.consentContainer}>
        <TouchableOpacity style={styles.checkbox}>
          <MaterialIcons name="check-box" size={24} color="#8B00FF" />
        </TouchableOpacity>
        <Text style={styles.consentText}>
          I confirm that all information provided is true and correct. I agree to the Terms & Conditions.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeScreen>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Bank Account</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Progress Text */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>Step {step} of 5</Text>
          <Text style={styles.progressTitle}>
            {step === 1 && 'Basic Information'}
            {step === 2 && 'Address Details'}
            {step === 3 && 'Bank Account'}
            {step === 4 && 'KYC Documents'}
            {step === 5 && 'Nominee & Summary'}
          </Text>
        </View>

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          {step < 5 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Submit & Verify</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
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
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  placeholder: {
    width: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#0A0A0A',
  },
  step: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  activeStep: {
    backgroundColor: '#8B00FF',
    borderColor: '#8B00FF',
  },
  stepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeStepText: {
    color: '#fff',
  },
  stepLine: {
    width: 35,
    height: 2,
    backgroundColor: '#1A1A1A',
    marginHorizontal: 4,
  },
  activeStepLine: {
    backgroundColor: '#8B00FF',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B00FF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  formContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B00FF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 6,
    fontWeight: '500',
  },
  required: {
    color: '#FF5252',
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  inputError: {
    borderColor: '#FF5252',
  },
  errorText: {
    fontSize: 12,
    color: '#FF5252',
    marginTop: 4,
  },
  hintText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfContainer: {
    width: '48%',
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCode: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
    borderRightWidth: 0,
  },
  phoneField: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  radioGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 8,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  selectedRadio: {
    borderColor: '#8B00FF',
  },
  selectedRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8B00FF',
  },
  radioLabel: {
    fontSize: 14,
    color: '#fff',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectedPicker: {
    backgroundColor: '#8B00FF',
    borderColor: '#8B00FF',
  },
  pickerText: {
    fontSize: 13,
    color: '#fff',
  },
  selectedPickerText: {
    color: '#fff',
    fontWeight: '500',
  },
  kycNote: {
    flexDirection: 'row',
    backgroundColor: '#0A2A4A',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#8B00FF',
  },
  kycNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    marginLeft: 8,
    lineHeight: 18,
  },
  nomineeNote: {
    flexDirection: 'row',
    backgroundColor: '#4A1A2A',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  nomineeNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
    marginLeft: 8,
    lineHeight: 18,
  },
  summaryContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B00FF',
    marginBottom: 12,
  },
  summarySection: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingLeft: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
  },
  summaryValue: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 8,
  },
  consentText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  nextButton: {
    backgroundColor: '#8B00FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
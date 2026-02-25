// Support button component for video player
// Support creators with payment and subscription options

import React, { useState } from 'react';
import { TouchableOpacity, Text, View, Modal, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const SupportButton = ({ 
  size = 24, 
  creatorId, 
  creatorName,
  isSupported = false,
  supportCount = 0,
  onPress,
  style 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTier, setSelectedTier] = useState('monthly');
  
  const supportTiers = [
    {
      id: 'monthly',
      name: 'Monthly Support',
      price: '$4.99',
      benefits: ['Ad-free viewing', 'Exclusive content', 'Direct messages'],
      icon: '📅',
      popular: true
    },
    {
      id: 'yearly',
      name: 'Yearly Support', 
      price: '$49.99',
      benefits: ['Everything in Monthly', '30% savings', 'Early access'],
      icon: '💎',
      savings: 'Save 40%',
      popular: false
    },
    {
      id: 'lifetime',
      name: 'Lifetime Support',
      price: '$149.99',
      benefits: ['Forever access', 'All future features', 'Priority support'],
      icon: '👑',
      savings: 'Best value',
      popular: false
    }
  ];
  
  const handlePress = () => {
    setModalVisible(true);
    onPress?.();
  };
  
  const toggleSupport = () => {
    const newSupportState = !isSupported;
    
    Alert.alert(
      newSupportState ? 'Support Creator' : 'Remove Support',
      newSupportState 
        ? `You're now supporting ${creatorName}! Thank you for your support.`
        : `You've removed support for ${creatorName}.`,
      [
        { 
          text: 'OK', 
          onPress: () => {
            // In production, this would call your support API
            console.log(`${newSupportState ? 'SUPPORTED' : 'UNSUPPORTED'}: ${creatorId}`);
          }
        }
      ]
    );
    
    setModalVisible(false);
  };
  
  const handleSubscribe = (tier) => {
    Alert.alert(
      'Confirm Subscription',
      `Subscribe to ${tier.name} - ${tier.price}?`,
      [
        { 
          text: 'Cancel', 
          onPress: () => console.log('Subscription cancelled')
        },
        { 
          text: 'Subscribe', 
          onPress: () => {
            // In production, this would open payment flow
            console.log(`Subscribed to: ${tier.id} - ${tier.price}`);
            
            Alert.alert(
              'Thank You!',
              `Successfully subscribed to ${tier.name}. You'll be charged ${tier.price}.`,
              [{ text: 'OK', onPress: () => setModalVisible(false) }]
            );
          }
        }
      ]
    );
  };
  
  const renderTier = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.tierItem,
        selectedTier === item.id && styles.selectedTier
      ]}
      onPress={() => setSelectedTier(item.id)}
    >
      <View style={styles.tierHeader}>
        <Text style={styles.tierIcon}>{item.icon}</Text>
        <View style={styles.tierInfo}>
          <Text style={styles.tierName}>{item.name}</Text>
          {item.savings && (
            <Text style={styles.savings}>{item.savings}</Text>
          )}
        </View>
        <Text style={styles.tierPrice}>{item.price}</Text>
      </View>
      </View>
      
      <View style={styles.benefitsContainer}>
        {item.benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );
  
  return (
    <>
      <TouchableOpacity 
        onPress={handlePress}
        style={[styles.container, style]}
        activeOpacity={0.8}
      >
        <Ionicons 
          name={isSupported ? 'heart' : 'heart-outline'} 
          size={size} 
          color={isSupported ? '#FFD700' : '#FFD700'} 
        />
        
        {supportCount > 0 && (
          <Text style={styles.count}>{supportCount}</Text>
        )}
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Support {creatorName}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.description}>
              Support your favorite creators and help them create more amazing content.
            </Text>
            
            {/* Current support status */}
            <View style={styles.currentStatusContainer}>
              <View style={[
                styles.statusItem,
                isSupported && styles.supportedStatus
              ]}>
                <Ionicons 
                  name={isSupported ? 'heart' : 'heart-outline'} 
                  size={16} 
                  color={isSupported ? '#FF3B5C' : '#999'} 
                />
                <Text style={[
                  styles.statusText,
                  isSupported && styles.supportedText
                ]}>
                  {isSupported ? 'Currently Supporting' : 'Not Supporting'}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={styles.toggleButton}
                onPress={toggleSupport}
              >
                <Text style={styles.toggleButtonText}>
                  {isSupported ? 'Remove Support' : 'Support Now'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.orText}>OR</Text>
            
            {/* Subscription tiers */}
            <TouchableOpacity 
              style={styles.subscribeButton}
              onPress={() => handleSubscribe(supportTiers.find(t => t.id === selectedTier))}
            >
              <Text style={styles.subscribeButtonText}>Upgrade Support</Text>
            </TouchableOpacity>
            </View>
            
            {/* Tier options */}
            <FlatList
              data={supportTiers}
              renderItem={renderTier}
              keyExtractor={item => item.id}
              style={styles.tiersList}
            />
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
  count: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
  currentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  supportedStatus: {
    backgroundColor: '#E8F5E8',
  },
  supportedText: {
    color: '#4CAF50',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 10,
    color: '#666',
  },
  toggleButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  orText: {
    fontSize: 16,
    color: '#999',
    marginHorizontal: 10,
  },
  subscribeButton: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  subscribeButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tiersList: {
    marginBottom: 20,
  },
  tierItem: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    margin: 5,
    backgroundColor: '#F8F8F8',
  },
  selectedTier: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FF',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tierIcon: {
    fontSize: 24,
  },
  tierInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  tierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  savings: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  tierPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  benefitsContainer: {
    marginTop: 10,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  benefitText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
};

export default SupportButton;

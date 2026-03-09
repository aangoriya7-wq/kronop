import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const menuItems = [
    {
      id: 'profile',
      icon: 'person' as const,
      title: 'Profile',
      onPress: () => router.push('/(tabs)/profile'),
    },
    {
      id: 'biometric',
      icon: 'finger-print' as const,
      title: 'Biometric Security',
      onPress: () => router.push('/menu/biometric'),
    },
    {
      id: 'blocked',
      icon: 'shield-checkmark' as const,
      title: 'Blocked Users',
      onPress: () => router.push('/menu/blocked'),
    },
    {
      id: 'privacy',
      icon: 'lock-closed' as const,
      title: 'Privacy Policy',
      onPress: () => console.log('Privacy Policy pressed'),
    },
    {
      id: 'about',
      icon: 'information-circle' as const,
      title: 'About',
      onPress: () => console.log('About pressed'),
    },
    {
      id: 'logout',
      icon: 'log-out' as const,
      title: 'Logout',
      onPress: () => router.push('/menu/Logout'),
    },
    {
      id: 'delete-account',
      icon: 'trash' as const,
      title: 'Delete Account',
      onPress: () => router.push('/menu/DeleteAccount'),
    },

  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menu</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Menu Items */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon} size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.menuItemText}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={16} color="#666666" />
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

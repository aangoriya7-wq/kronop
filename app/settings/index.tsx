import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingItem {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

const settingsData: SettingItem[] = [
  { id: 'AntiPeepingShield', name: 'Anti Peeping Shield', icon: 'visibility-off', enabled: false },
  { id: 'BatterySaverMode', name: 'Battery Saver Mode', icon: 'battery-saver', enabled: false },
  { id: 'BiometricLock', name: 'Biometric Lock', icon: 'fingerprint', enabled: false },
  { id: 'ContentFilter', name: 'Content Filter', icon: 'filter-list', enabled: false },
  { id: 'CustomAlertTones', name: 'Custom Alert Tones', icon: 'notifications', enabled: false },
  { id: 'DataSaverTurbine', name: 'Data Saver Turbine', icon: 'data-saver', enabled: false },
  { id: 'DynamicThemes', name: 'Dynamic Themes', icon: 'palette', enabled: false },
  { id: 'FocusGuard', name: 'Focus Guard', icon: 'do-not-disturb', enabled: false },
  { id: 'GhostStealth', name: 'Ghost Stealth', icon: 'visibility', enabled: false },
  { id: 'InAppTranslator', name: 'In App Translator', icon: 'translate', enabled: false },
  { id: 'Language', name: 'Language', icon: 'language', enabled: false },
  { id: 'LinkedDevices', name: 'Linked Devices', icon: 'devices', enabled: false },
  { id: 'Notifications', name: 'Notifications', icon: 'notifications-active', enabled: false },
  { id: 'OfflineVault', name: 'Offline Vault', icon: 'lock', enabled: false },
  { id: 'Profile', name: 'Profile', icon: 'person', enabled: false },
  { id: 'QuickReplyBubbles', name: 'Quick Reply Bubbles', icon: 'chat', enabled: false },
  { id: 'Security', name: 'Security', icon: 'security', enabled: false },
  { id: 'SelfDestructChats', name: 'Self Destruct Chats', icon: 'timer-off', enabled: false },
  { id: 'ShakeToReport', name: 'Shake To Report', icon: 'report-problem', enabled: false },
  { id: 'StorageManager', name: 'Storage Manager', icon: 'storage', enabled: false },
  { id: 'Logout', name: 'Logout', icon: 'logout', enabled: false },
  { id: 'DeleteAccount', name: 'Delete Account', icon: 'delete', enabled: false },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<SettingItem[]>(settingsData);

  const toggleSetting = (id: string) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const handleSettingPress = (setting: SettingItem) => {
    // Navigate to specific setting screen
    router.push(`/settings/${setting.id}` as any);
  };

  const renderSettingItem = (setting: SettingItem) => (
    <TouchableOpacity 
      key={setting.id}
      style={styles.settingItem}
      onPress={() => handleSettingPress(setting)}
      activeOpacity={0.7}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <MaterialIcons name={setting.icon as any} size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.settingName}>{setting.name}</Text>
      </View>
      
      {setting.id === 'Logout' || setting.id === 'DeleteAccount' ? (
        <MaterialIcons name="chevron-right" size={20} color="#666666" />
      ) : (
        <TouchableOpacity 
          style={[styles.toggleButton, setting.enabled && styles.toggleButtonEnabled]}
          onPress={() => toggleSetting(setting.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.toggleCircle, setting.enabled && styles.toggleCircleEnabled]} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        
        <View style={styles.settingsContainer}>
          {settings.map(renderSettingItem)}
        </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  settingsContainer: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  settingName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  toggleButton: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#333333',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleButtonEnabled: {
    backgroundColor: '#8B00FF',
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleCircleEnabled: {
    alignSelf: 'flex-end',
  },
});


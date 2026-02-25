import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: '#000000' }
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="AntiPeepingShield" />
      <Stack.Screen name="BatterySaverMode" />
      <Stack.Screen name="BiometricLock" />
      <Stack.Screen name="ContentFilter" />
      <Stack.Screen name="CustomAlertTones" />
      <Stack.Screen name="DataSaverTurbine" />
      <Stack.Screen name="DynamicThemes" />
      <Stack.Screen name="FocusGuard" />
      <Stack.Screen name="GhostStealth" />
      <Stack.Screen name="InAppTranslator" />
      <Stack.Screen name="Language" />
      <Stack.Screen name="LinkedDevices" />
      <Stack.Screen name="Logout" />
      <Stack.Screen name="Notifications" />
      <Stack.Screen name="OfflineVault" />
      <Stack.Screen name="Profile" />
      <Stack.Screen name="QuickReplyBubbles" />
      <Stack.Screen name="Security" />
      <Stack.Screen name="SelfDestructChats" />
      <Stack.Screen name="ShakeToReport" />
      <Stack.Screen name="StorageManager" />
      <Stack.Screen name="DeleteAccount" />
    </Stack>
  );
}


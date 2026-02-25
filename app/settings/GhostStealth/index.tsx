import React from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import { SafeScreen } from '../../../components/layout/SafeScreen';
import { theme } from '../../../constants/theme';
import { useGhostStealth } from '@/context/GhostStealthContext';

export default function GhostStealth() {
  const { isGhostMode, toggleGhostMode, loading } = useGhostStealth();

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>घोस्ट मोड</Text>
            <Switch
              value={isGhostMode}
              onValueChange={toggleGhostMode}
              trackColor={{ false: '#767577', true: theme.colors.primary.main }}
              thumbColor={isGhostMode ? '#ffffff' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.description}>
            इसे चालू करने पर आप ऑनलाइन नहीं दिखेंगे और किसी को पता नहीं चलेगा कि आपने मैसेज पढ़ा है।
          </Text>
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
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: theme.colors.background.elevated,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    ...theme.elevation.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  description: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.secondary,
    lineHeight: 24,
  },
});


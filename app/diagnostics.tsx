import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function DiagnosticsScreen() {
  const stats = [
    { label: 'Status', value: 'Online' },
    { label: 'Database', value: 'MongoDB Connected' }
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Diagnostics</Text>
      {stats.map((item, index) => (
        <View key={index} style={styles.item}>
          <Text>{item.label}: {item.value}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' }
});

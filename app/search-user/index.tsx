import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeScreen } from '../../components/layout/SafeScreen';
import { theme } from '../../constants/theme';

interface User {
  id: string;
  username: string;
  name: string;
  avatar: string;
}

export default function SearchUserScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      username: 'john_doe',
      name: 'John Doe',
      avatar: 'https://via.placeholder.com/50',
    },
    {
      id: '2',
      username: 'jane_smith',
      name: 'Jane Smith',
      avatar: 'https://via.placeholder.com/50',
    },
    {
      id: '3',
      username: 'mike_johnson',
      name: 'Mike Johnson',
      avatar: 'https://via.placeholder.com/50',
    },
  ]);

  const handleUserPress = (user: User) => {
    // Navigate to user's profile
    router.push(`/search-user/profile?username=${user.username}` as any);
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderUserItem = (user: User) => (
    <TouchableOpacity key={user.id} style={styles.userItem} onPress={() => handleUserPress(user)}>
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{user.name.charAt(0)}</Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.username}>{user.username}</Text>
        <Text style={styles.name}>{user.name}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeScreen>
      <View style={styles.container}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <MaterialIcons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        </View>

        {/* Users List */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.usersList}>
            {filteredUsers.map(renderUserItem)}
          </View>
          {filteredUsers.length === 0 && searchQuery && (
            <View style={styles.emptyState}>
              <MaterialIcons name="search-off" size={64} color={theme.colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptyDescription}>
                Try searching with a different query
              </Text>
            </View>
          )}
          {!searchQuery && (
            <View style={styles.emptyState}>
              <MaterialIcons name="search" size={64} color={theme.colors.text.tertiary} />
              <Text style={styles.emptyTitle}>Search Users</Text>
              <Text style={styles.emptyDescription}>
                Enter a username or name to search
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: theme.typography.fontSize.md,
  },
  scrollView: {
    flex: 1,
  },
  usersList: {
    paddingVertical: theme.spacing.sm,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  avatarText: {
    color: '#fff',
    fontSize: theme.typography.fontSize.lg,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  name: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  emptyDescription: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

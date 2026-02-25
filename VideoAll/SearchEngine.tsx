import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface SearchItem {
  id: string;
  title: string;
  type: 'video' | 'photo' | 'user' | 'channel';
  thumbnail?: string;
}

interface SearchEngineProps {
  data: SearchItem[];
  onSearch: (query: string) => void;
  onItemPress: (item: SearchItem) => void;
  placeholder?: string;
}

export default function SearchEngine({ 
  data, 
  onSearch, 
  onItemPress, 
  placeholder = "Search videos, photos, users..." 
}: SearchEngineProps) {
  const [query, setQuery] = useState('');
  const [filteredData, setFilteredData] = useState<SearchItem[]>([]);

  const handleSearch = (text: string) => {
    setQuery(text);
    
    if (text.trim() === '') {
      setFilteredData([]);
      onSearch('');
      return;
    }

    const filtered = data.filter(item =>
      item.title.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredData(filtered);
    onSearch(text);
  };

  const renderSearchItem = ({ item }: { item: SearchItem }) => (
    <TouchableOpacity 
      style={styles.searchItem} 
      onPress={() => onItemPress(item)}
    >
      <View style={styles.itemLeft}>
        <MaterialIcons 
          name={getItemIcon(item.type)} 
          size={20} 
          color={theme.colors.text.secondary} 
          style={styles.itemIcon} 
        />
        <Text style={styles.itemTitle}>{item.title}</Text>
      </View>
      <View style={styles.itemTypeBadge}>
        <Text style={styles.itemTypeText}>{item.type}</Text>
      </View>
    </TouchableOpacity>
  );

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'video': return 'videocam';
      case 'photo': return 'photo';
      case 'user': return 'person';
      case 'channel': return 'account-circle';
      default: return 'search';
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <MaterialIcons 
          name="search" 
          size={20} 
          color={theme.colors.text.secondary} 
          style={styles.searchIcon} 
        />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={handleSearch}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.secondary}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <MaterialIcons 
              name="clear" 
              size={20} 
              color={theme.colors.text.secondary} 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      {query.length > 0 && (
        <FlatList
          data={filteredData}
          renderItem={renderSearchItem}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons 
                name="search-off" 
                size={40} 
                color={theme.colors.text.tertiary} 
              />
              <Text style={styles.emptyText}>No results found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.elevated,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    margin: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    paddingVertical: 2,
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    marginRight: theme.spacing.md,
  },
  itemTitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    flex: 1,
  },
  itemTypeBadge: {
    backgroundColor: theme.colors.background.elevated,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  itemTypeText: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    textTransform: 'capitalize',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.md,
  },
});

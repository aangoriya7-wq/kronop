import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';

import { SafeScreen } from '../../components/layout/SafeScreen';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { AppColors } from '../../appColor/AppColors';
import { useRouter } from 'expo-router';
import WalletConnect from '../../frontend/WalletConnect';

interface ContentStats {
  total: number;
  stars: number;
  comments: number;
  shares: number;
  views: number;
}

interface TotalData {
  totalContent: number;
  totalStars: number;
  totalComments: number;
  totalShares: number;
  totalViews: number;
}

interface SectionData {
  name: string;
  screen: string;
  icon: string;
  stats: ContentStats;
}

export default function UserDataScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const [totalData, setTotalData] = useState<TotalData>({
    totalContent: 0,
    totalStars: 0,
    totalComments: 0,
    totalShares: 0,
    totalViews: 0,
  });

  const [sections, setSections] = useState<SectionData[]>([
    { name: 'Video Tool', screen: 'VideoTool', icon: 'videocam', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 } },
    { name: 'Reels Tool', screen: 'ReelsTool', icon: 'movie', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 } },
    { name: 'Photo Tool', screen: 'PhotoTool', icon: 'photo', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 } },
    { name: 'Story Tool', screen: 'StoryTool', icon: 'auto-stories', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 } },
    { name: 'Live Tool', screen: 'LiveTool', icon: 'live-tv', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 } },
    { name: 'Song Tool', screen: 'SongTool', icon: 'music-note', stats: { total: 0, stars: 0, comments: 0, shares: 0, views: 0 } },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const loadData = async () => {
    try {
      setLoading(true);

      // Load summary data from AsyncStorage or API
      // This is sample data - replace with actual API calls
      const mockStats = [
        { total: 12, stars: 345, comments: 89, shares: 45, views: 1234 },
        { total: 8, stars: 567, comments: 123, shares: 67, views: 2345 },
        { total: 25, stars: 789, comments: 234, shares: 89, views: 3456 },
        { total: 15, stars: 234, comments: 56, shares: 34, views: 987 },
        { total: 5, stars: 123, comments: 45, shares: 23, views: 654 },
        { total: 20, stars: 456, comments: 78, shares: 56, views: 876 },
      ];

      const newSections = sections.map((section, index) => ({
        ...section,
        stats: mockStats[index]
      }));

      setSections(newSections);

      const total = newSections.reduce(
        (acc, section) => {
          acc.totalContent += section.stats.total;
          acc.totalStars += section.stats.stars;
          acc.totalComments += section.stats.comments;
          acc.totalShares += section.stats.shares;
          acc.totalViews += section.stats.views;
          return acc;
        },
        { totalContent: 0, totalStars: 0, totalComments: 0, totalShares: 0, totalViews: 0 }
      );

      setTotalData(total);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSectionPress = (section: SectionData) => {
    // Navigate to respective screen with data using Expo Router
    const screenMap: Record<string, string> = {
      'VideoTool': '/Databes/VideoToolScreen',
      'ReelsTool': '/Databes/ReelsToolScreen',
      'PhotoTool': '/Databes/PhotoToolScreen',
      'StoryTool': '/Databes/StoryToolScreen',
      'LiveTool': '/Databes/LiveToolScreen',
      'SongTool': '/Databes/SongToolScreen',
      'BankAccount': '/Databes/BankAccount',
      'video/[id]': '/video/[id]',
    };

    const route = screenMap[section.screen];
    if (route) {
      router.push({
        pathname: route as any,
        params: {
          title: section.name,
          stats: JSON.stringify(section.stats)
        }
      });
    }
  };

  const handleYourEarning = () => {
    Alert.alert(
      "Your Earning",
      `Total Stars: ${totalData.totalStars}\nTotal Comments: ${totalData.totalComments}\nTotal Shares: ${totalData.totalShares}\nTotal Views: ${totalData.totalViews}`,
      [{ text: "OK" }]
    );
  };

  const handleAddBankAccount = () => {
    router.push('/Databes/BankAccount');
  };

  const handleWalletConnection = () => {
    setShowWalletModal(true);
  };

  const getRank = () => {
    const total = totalData.totalStars;
    if (total > 10000) return "Diamond";
    if (total > 5000) return "Platinum";
    if (total > 1000) return "Gold";
    if (total > 500) return "Silver";
    if (total > 100) return "Bronze";
    return "Beginner";
  };

  if (loading) {
    return (
      <SafeScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.loading} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[AppColors.refresh]} />
        }
      >

        {/* Your Rank Card */}
        <View style={styles.rankCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="stars" size={24} color={AppColors.primary.main} />
            <Text style={styles.cardTitle}>Your Rank</Text>
          </View>

          <View style={styles.rankContainer}>
            <View style={styles.rankBadge}>
              <Ionicons name="trophy" size={32} color={AppColors.gold} />
              <Text style={styles.rankText}>{getRank()}</Text>
            </View>

            <View style={styles.rankStats}>
              <View style={styles.rankStatItem}>
                <Text style={styles.rankStatLabel}>Total Stars</Text>
                <Text style={styles.rankStatValue}>{totalData.totalStars.toLocaleString()}</Text>
              </View>
              <View style={styles.rankStatItem}>
                <Text style={styles.rankStatLabel}>Content Count</Text>
                <Text style={styles.rankStatValue}>{totalData.totalContent}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Your Earning Button */}
        <TouchableOpacity style={styles.earningButton} onPress={handleYourEarning}>
          <MaterialIcons name="account-balance-wallet" size={22} color={AppColors.primary.main} />
          <Text style={styles.earningButtonText}>Your Earning</Text>
          <MaterialIcons name="arrow-forward" size={18} color={AppColors.primary.main} />
        </TouchableOpacity>

        {/* Database Sections - Clickable Cards */}
        <View style={styles.databaseContainer}>
          <View style={styles.databaseHeader}>
            <MaterialIcons name="storage" size={20} color={AppColors.primary.main} />
            <Text style={styles.databaseTitle}>Database</Text>
          </View>

          {sections.map((section, index) => (
            <TouchableOpacity
              key={index}
              style={styles.databaseCard}
              onPress={() => handleSectionPress(section)}
            >
              <View style={styles.databaseRow}>
                <View style={styles.databaseLeft}>
                  <MaterialIcons name={section.icon as any} size={22} color={AppColors.primary.main} />
                  <View style={styles.databaseInfo}>
                    <Text style={styles.databaseName}>{section.name}</Text>
                    <Text style={styles.databaseCount}>{section.stats.total} items</Text>
                  </View>
                </View>

                <View style={styles.databaseStats}>
                  <View style={styles.statBadge}>
                    <Ionicons name="star" size={12} color={AppColors.gold} />
                    <Text style={styles.statBadgeText}>{section.stats.stars}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={AppColors.icon.inactive} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Wallet Connection Button */}
        <TouchableOpacity style={styles.walletButton} onPress={handleWalletConnection}>
          <MaterialIcons name="account-balance-wallet" size={22} color={AppColors.primary.main} />
          <Text style={styles.walletButtonText}>Wallet Connection</Text>
          <MaterialIcons name="arrow-forward" size={18} color={AppColors.primary.main} />
        </TouchableOpacity>

        {/* Add Bank Account Button */}
        <TouchableOpacity style={styles.bankButton} onPress={handleAddBankAccount}>
          <MaterialIcons name="account-balance" size={22} color={AppColors.primary.main} />
          <Text style={styles.bankButtonText}>Add Bank Account</Text>
          <MaterialIcons name="arrow-forward" size={18} color={AppColors.primary.main} />
        </TouchableOpacity>
      </ScrollView>

      {/* Wallet Modal */}
      <Modal
        visible={showWalletModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWalletModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowWalletModal(false)}>
              <MaterialIcons name="close" size={24} color={AppColors.primary.main} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Wallet Connection</Text>
            <View style={styles.placeholder} />
          </View>
          <WalletConnect />
        </View>
      </Modal>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },
  scrollContent: {
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: AppColors.text.tertiary,
  },
  rankCard: {
    backgroundColor: AppColors.background.secondary,
    margin: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AppColors.primary.main,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.secondary,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.primary.main,
    marginLeft: 8,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    alignItems: 'center',
    marginRight: 20,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.gold,
    marginTop: 4,
  },
  rankStats: {
    flex: 1,
  },
  rankStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rankStatLabel: {
    fontSize: 14,
    color: AppColors.text.tertiary,
  },
  rankStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text.primary,
  },
  earningButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.background.secondary,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.primary.main,
  },
  earningButtonText: {
    color: AppColors.primary.main,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginLeft: 10,
  },
  databaseContainer: {
    margin: 12,
  },
  databaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  databaseTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.primary.main,
    marginLeft: 6,
  },
  databaseCard: {
    backgroundColor: AppColors.background.secondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.border.primary,
    marginBottom: 8,
  },
  databaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  databaseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  databaseInfo: {
    marginLeft: 12,
  },
  databaseName: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.text.primary,
    marginBottom: 2,
  },
  databaseCount: {
    fontSize: 12,
    color: AppColors.text.tertiary,
  },
  databaseStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.background.elevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statBadgeText: {
    fontSize: 12,
    color: AppColors.text.primary,
    marginLeft: 4,
  },
  bankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.background.secondary,
    margin: 12,
    marginTop: 0,
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.primary.main,
  },
  bankButtonText: {
    color: AppColors.primary.main,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginLeft: 10,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: AppColors.background.secondary,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.primary.main,
  },
  walletButtonText: {
    color: AppColors.primary.main,
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: AppColors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border.secondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text.primary,
  },
  placeholder: {
    width: 24,
  },
});
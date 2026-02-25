import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DemoUser {
  id: string;
  name: string;
  username: string;
  bio: string;
  profileImage: string;
  coverImage: string;
  website: string;
  location: string;
  stats: {
    posts: number;
    supporters: number;
    supporting: number;
  };
}

export const DEMO_USER: DemoUser = {
  id: 'demo_user_kronop',
  name: 'Kronop Demo',
  username: '@kronop_demo',
  bio: 'This is a demo profile. Here you can see how app works.',
  profileImage: 'https://picsum.photos/seed/kronop_profile/300/300',
  coverImage: 'https://picsum.photos/seed/kronop_cover/1080/400',
  website: '',
  location: 'India',
  stats: {
    posts: 0,
    supporters: 0,
    supporting: 0,
  }
};

export const DEMO_MESSAGES = {
  reels: {
    title: 'No reels yet',
    subtitle: 'Create your first reel'
  },
  videos: {
    title: 'No videos yet',
    subtitle: 'Upload your first video'
  },
  live: {
    title: 'No live sessions yet',
    subtitle: 'Go live to connect with your audience'
  },
  photos: {
    title: 'No photos yet',
    subtitle: 'Upload your first photo to get started'
  },
  stories: {
    title: 'No stories yet',
    subtitle: 'Share your first story'
  },
  shayari: {
    title: 'No shayari yet',
    subtitle: 'Write your first shayari'
  },
  songs: {
    title: 'No songs yet',
    subtitle: 'Music player coming soon'
  },
  saved: {
    title: 'No saved items yet',
    subtitle: 'Save posts you want to revisit later'
  }
};

class DemoUserService {
  private static instance: DemoUserService;
  
  static getInstance(): DemoUserService {
    if (!DemoUserService.instance) {
      DemoUserService.instance = new DemoUserService();
    }
    return DemoUserService.instance;
  }

  async isDemoMode(): Promise<boolean> {
    try {
      const isDemo = await AsyncStorage.getItem('demo_mode');
      return isDemo === 'true';
    } catch (error) {
      console.error('Error checking demo mode:', error);
      return false;
    }
  }

  async setDemoMode(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem('demo_mode', enabled.toString());
    } catch (error) {
      console.error('Error setting demo mode:', error);
    }
  }

  async getDemoUser(): Promise<DemoUser> {
    return DEMO_USER;
  }

  getDemoMessage(section: keyof typeof DEMO_MESSAGES) {
    return DEMO_MESSAGES[section] || DEMO_MESSAGES.reels;
  }

  // Check if user should see demo profile
  async shouldShowDemoProfile(): Promise<boolean> {
    try {
      const hasSeenDemo = await AsyncStorage.getItem('has_seen_demo');
      const isFirstTime = await AsyncStorage.getItem('is_first_time');
      
      // Show demo if first time or hasn't seen demo
      return isFirstTime === 'true' || hasSeenDemo !== 'true';
    } catch (error) {
      console.error('Error checking demo profile status:', error);
      return true; // Default to showing demo
    }
  }

  async markDemoAsSeen(): Promise<void> {
    try {
      await AsyncStorage.setItem('has_seen_demo', 'true');
      await AsyncStorage.setItem('is_first_time', 'false');
    } catch (error) {
      console.error('Error marking demo as seen:', error);
    }
  }

  // Reset to demo mode (for testing)
  async resetToDemo(): Promise<void> {
    try {
      await AsyncStorage.setItem('demo_mode', 'true');
      await AsyncStorage.setItem('has_seen_demo', 'false');
      await AsyncStorage.setItem('is_first_time', 'true');
    } catch (error) {
      console.error('Error resetting to demo:', error);
    }
  }
}

export default DemoUserService.getInstance();

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

// Import sections
import CameraSection from './src/components/sections/CameraSection';
import GallerySection from './src/components/sections/GallerySection';
import FilesSection from './src/components/sections/FilesSection';
import DriveSection from './src/components/sections/DriveSection';
import NotebookLMSection from './src/components/sections/NotebookLMSection';
import SupportScreen from './src/components/SupportScreen';

// Import permissions
import PermissionManager from './src/utils/permissions';

export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Gallery: undefined;
  Files: undefined;
  Drive: undefined;
  NotebookLM: undefined;
  Support: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen({ navigation }: any) {
  const sections = [
    {
      id: 'camera',
      title: '📸 Camera',
      description: 'Capture photos and videos',
      icon: 'camera',
      screen: 'Camera' as keyof RootStackParamList,
    },
    {
      id: 'gallery',
      title: '🖼️ Gallery',
      description: 'View and manage images',
      icon: 'images',
      screen: 'Gallery' as keyof RootStackParamList,
    },
    {
      id: 'files',
      title: '📁 Files',
      description: 'Manage documents and files',
      icon: 'document',
      screen: 'Files' as keyof RootStackParamList,
    },
    {
      id: 'drive',
      title: '☁️ Drive',
      description: 'Cloud storage access',
      icon: 'cloud',
      screen: 'Drive' as keyof RootStackParamList,
    },
    {
      id: 'notebook',
      title: '🤖 NotebookLM',
      description: 'AI-powered assistant',
      icon: 'chatbot',
      screen: 'NotebookLM' as keyof RootStackParamList,
    },
    {
      id: 'support',
      title: '🎧 Support',
      description: 'Get help and support',
      icon: 'help-circle',
      screen: 'Support' as keyof RootStackParamList,
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <Text style={styles.appTitle}>Kronop App Suite</Text>
        <Text style={styles.appSubtitle}>Your complete productivity companion</Text>
      </View>

      <ScrollView style={styles.sectionsContainer}>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.id}
            style={styles.sectionCard}
            onPress={() => navigation.navigate(section.screen)}
          >
            <View style={styles.sectionIcon}>
              <Ionicons name={section.icon as any} size={32} color="#4A2C5F" />
            </View>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionDescription}>{section.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 Kronop Technologies</Text>
        <Text style={styles.footerSubtext}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

export default function App() {
  React.useEffect(() => {
    // Initialize permissions on app start
    PermissionManager.requestCameraPermission();
    PermissionManager.requestGalleryPermission();
    PermissionManager.requestStoragePermission();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#000000',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'Kronop Suite' }}
        />
        <Stack.Screen 
          name="Camera" 
          component={CameraSection}
          options={{ title: 'Camera' }}
        />
        <Stack.Screen 
          name="Gallery" 
          component={GallerySection}
          options={{ title: 'Gallery' }}
        />
        <Stack.Screen 
          name="Files" 
          component={FilesSection}
          options={{ title: 'Files' }}
        />
        <Stack.Screen 
          name="Drive" 
          component={DriveSection}
          options={{ title: 'Cloud Drive' }}
        />
        <Stack.Screen 
          name="NotebookLM" 
          component={NotebookLMSection}
          options={{ title: 'NotebookLM' }}
        />
        <Stack.Screen 
          name="Support" 
          component={SupportScreen}
          options={{ title: 'Support Center' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    padding: 30,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  appTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appSubtitle: {
    color: '#999999',
    fontSize: 16,
  },
  sectionsContainer: {
    flex: 1,
    padding: 20,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 20,
    marginBottom: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    color: '#999999',
    fontSize: 14,
  },
  footer: {
    padding: 20,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  footerText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  footerSubtext: {
    color: '#999999',
    fontSize: 12,
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Eye } from 'lucide-react-native';
import { getViewerCount } from '../ZeroLogic';

interface ViewerCountProps {
  videoId: string;
}

const ViewerCount: React.FC<ViewerCountProps> = ({ videoId }) => {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchViewerCount = async () => {
      const viewerCount = await getViewerCount(videoId);
      setCount(viewerCount);
      setIsLoading(false);
    };

    fetchViewerCount();

    // Update viewer count every 30 seconds
    const interval = setInterval(fetchViewerCount, 30000);

    return () => clearInterval(interval);
  }, [videoId]);

  if (isLoading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Eye size={16} color="#FFFFFF" strokeWidth={1.5} />
      <Text style={styles.count}>{count.toLocaleString()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  count: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '300',
    opacity: 0.9,
  },
});

export default ViewerCount;

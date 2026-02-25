import React, { useEffect, useRef, useState } from 'react';
import { Text, View, Animated, Dimensions, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MarqueeTextProps {
  text: string;
  icon?: boolean;
  speed?: number;
  style?: ViewStyle;
}

const MarqueeText: React.FC<MarqueeTextProps> = ({ 
  text, 
  icon = true, 
  speed = 50,
  style 
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [textWidth, setTextWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (textWidth > containerWidth && containerWidth > 0) {
      Animated.loop(
        Animated.timing(animatedValue, {
          toValue: -textWidth,
          duration: textWidth * speed / 10,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [textWidth, containerWidth, animatedValue, speed]);

  const handleTextLayout = (event: any) => {
    setTextWidth(event.nativeEvent.layout.width);
  };

  const handleContainerLayout = (event: any) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  return (
    <View 
      style={[styles.container, style]} 
      onLayout={handleContainerLayout}
    >
      {icon && (
        <MaterialIcons 
          name="music-note" 
          size={14} 
          color="#fff" 
          style={styles.musicIcon}
        />
      )}
      <View style={styles.textContainer}>
        {textWidth <= containerWidth ? (
          <Text style={styles.marqueeText}>{text}</Text>
        ) : (
          <Animated.View
            style={[
              styles.animatedText,
              {
                transform: [{ translateX: animatedValue }],
                width: textWidth * 2,
              },
            ]}
          >
            <Text 
              style={styles.marqueeText}
              onLayout={handleTextLayout}
            >
              {text}
            </Text>
            <Text style={[styles.marqueeText, styles.duplicateText]}>
              {text}
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: '80%',
  },
  musicIcon: {
    marginRight: 6,
  },
  textContainer: {
    flex: 1,
    overflow: 'hidden' as const,
  },
  animatedText: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  marqueeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500' as const,
    paddingHorizontal: 4,
  },
  duplicateText: {
    paddingLeft: 20,
  },
});

export default MarqueeText;

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const RunningTitle = ({ title }) => {
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      translateX.setValue(300);
      Animated.timing(translateX, {
        toValue: -300,
        duration: 8000,
        useNativeDriver: true,
      }).start(() => {
        startAnimation();
      });
    };

    startAnimation();
  }, [translateX]);

  if (!title) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.titleContainer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },
});

export default RunningTitle;

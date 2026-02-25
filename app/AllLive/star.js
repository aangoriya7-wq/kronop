import React, { useState } from 'react';

import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

import { Ionicons } from '@expo/vector-icons';



export default function Star({ stars, isStarred, onPress }) {

  const [scale] = useState(new Animated.Value(1));



  const handlePress = () => {

    Animated.sequence([

      Animated.timing(scale, {

        toValue: 1.3,

        duration: 150,

        useNativeDriver: true,

      }),

      Animated.timing(scale, {

        toValue: 1,

        duration: 150,

        useNativeDriver: true,

      }),

    ]).start();

    

    onPress();

  };



  const formatNumber = (num) => {

    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';

    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';

    return num.toString();

  };



  return (

    <TouchableOpacity onPress={handlePress} style={styles.container}>

      <Animated.View style={{ transform: [{ scale }] }}>

        <Ionicons 

          name={isStarred ? 'star' : 'star-outline'} 

          size={24} 

          color={isStarred ? '#FFD700' : '#FFFFFF'} 

        />

      </Animated.View>

      <Text style={styles.count}>{formatNumber(stars)}</Text>

    </TouchableOpacity>

  );

}



const styles = StyleSheet.create({

  container: {

    alignItems: 'flex-end',

    backgroundColor: 'transparent',

    paddingHorizontal: 6,

    paddingVertical: 4,

    borderRadius: 30,

    minWidth: 50,

  },

  count: {

    color: '#FFFFFF',

    fontSize: 12,

    marginTop: 4,

    fontWeight: '600',

    textShadowColor: 'rgba(0, 0, 0, 0.8)',

    textShadowOffset: { width: 1, height: 1 },

    textShadowRadius: 2,

  },

});
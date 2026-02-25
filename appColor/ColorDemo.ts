/**
 * Color Demo - How to change app colors
 * 
 * This file demonstrates how to change the entire app color scheme
 * by modifying just the AppColors.ts file
 */

import { AppColors } from './AppColors';

// Example 1: Change to Blue Theme
export const BlueTheme = {
  ...AppColors,
  primary: {
    main: '#2196F3',      // Blue
    light: '#42A5F5',      // Light Blue
    dark: '#1976D2',       // Dark Blue
  },
  // ... rest of colors remain the same
};

// Example 2: Change to Green Theme
export const GreenTheme = {
  ...AppColors,
  primary: {
    main: '#4CAF50',      // Green
    light: '#66BB6A',      // Light Green
    dark: '#388E3C',       // Dark Green
  },
};

// Example 3: Change to Red Theme
export const RedTheme = {
  ...AppColors,
  primary: {
    main: '#F44336',      // Red
    light: '#EF5350',      // Light Red
    dark: '#D32F2F',       // Dark Red
  },
};

// Example 4: Dark Theme with Different Accent
export const DarkTheme = {
  ...AppColors,
  primary: {
    main: '#9C27B0',      // Purple
    light: '#BA68C8',      // Light Purple
    dark: '#7B1FA2',       // Dark Purple
  },
  background: {
    primary: '#121212',    // Darker Black
    secondary: '#1E1E1E',  // Dark Gray
    tertiary: '#2D2D2D',   // Medium Gray
    elevated: '#3D3D3D',   // Elevated Surface
  },
};

// HOW TO USE:
// 1. Open AppColors.ts
// 2. Replace the primary colors with your desired theme
// 3. Save the file
// 4. The entire app will automatically update!

export default {
  AppColors,
  BlueTheme,
  GreenTheme,
  RedTheme,
  DarkTheme,
};

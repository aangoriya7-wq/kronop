# App Color Management System

## 🎨 Centralized Color Control

This folder contains the centralized color management system for the entire app. You can change the app's color scheme from just one file!

## 📁 Files

- `AppColors.ts` - Main color definitions file
- `README.md` - This documentation

## 🚀 How to Change App Colors

### Option 1: Change Primary Color
To change the main app color (currently purple), edit `AppColors.ts`:

```typescript
export const AppColors = {
  primary: {
    main: '#YOUR_COLOR_HERE',      // Change this!
    light: '#LIGHTER_VERSION',
    dark: '#DARKER_VERSION',
  },
  // ... rest of colors
}
```

### Option 2: Complete Color Scheme Change
You can change any color category:
- `primary` - Main brand color
- `background` - Screen backgrounds
- `text` - Text colors
- `border` - Border colors
- `icon` - Icon colors
- `button` - Button colors
- And more!

## 🎯 Example: Change to Blue Theme

```typescript
export const AppColors = {
  primary: {
    main: '#2196F3',      // Blue
    light: '#42A5F5',      // Light Blue
    dark: '#1976D2',       // Dark Blue
  },
  // ... rest stays the same
}
```

## 📱 How Colors Are Used

### In Components
```typescript
import { AppColors } from '../appColor/AppColors';

// Use directly
style={{ color: AppColors.primary.main }}
style={{ backgroundColor: AppColors.background.primary }}

// Or use theme
import { theme } from '../constants/theme';
style={{ color: theme.colors.primary.main }}
```

### In Styles
```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.background.primary,
    borderColor: AppColors.primary.main,
  },
  title: {
    color: AppColors.text.primary,
  },
});
```

## 🔄 Automatic Updates

When you change colors in `AppColors.ts`, the changes will automatically apply to:

- ✅ All components using `theme.colors`
- ✅ All components using `AppColors` directly
- ✅ Tab bar colors
- ✅ Button colors
- ✅ Loading indicators
- ✅ And much more!

## 🎨 Current Color Scheme

- **Primary**: Purple (`#8B00FF`)
- **Background**: Deep Black (`#000000`)
- **Text**: White (`#FFFFFF`)
- **Icons**: Purple (`#8B00FF`)
- **Success**: Purple (`#8B00FF`)
- **Warning**: Orange (`#FFAA00`)

## 💡 Tips

1. **Test colors** - Make sure your color choices have good contrast
2. **Be consistent** - Use the predefined color categories
3. **Think about accessibility** - Ensure text is readable on backgrounds
4. **Preview** - Test your color changes on both light and dark surfaces

## 🔧 Adding New Colors

If you need a new color category, add it to `AppColors.ts`:

```typescript
export const AppColors = {
  // ... existing colors
  newCategory: {
    main: '#YOUR_COLOR',
    // ... add variations if needed
  },
}
```

Now you can change the entire app's appearance from just one file! 🎉

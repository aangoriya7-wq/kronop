import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const commonStyles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textPrimary: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.md,
  },
  textSecondary: {
    color: theme.colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
  },
  textBold: {
    fontWeight: theme.typography.fontWeight.bold,
  },
  shadow: {
    ...theme.elevation.sm,
  },
});

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Platform } from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const showAlert = (title: string, message?: string, buttons?: AlertButton[]) => {
    // SILENT MODE: Log to console only, no mobile alerts
    console.log(`[SILENT_ALERT]: ${title} - ${message || ''}`);
    
    // Execute button callbacks silently if provided
    if (buttons && buttons.length > 0) {
      // Execute the first non-cancel button or just close
      const confirmButton = buttons.find(b => b.style !== 'cancel');
      if (confirmButton?.onPress) {
        // Small delay to make it feel natural
        setTimeout(() => confirmButton.onPress?.(), 100);
      }
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

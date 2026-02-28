// @ts-nocheck
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import { AlertButton, AlertState } from './types';

// Create Context
const AlertContext = createContext<AlertContextType | undefined>(undefined);

// AlertProvider - unified platform handling
interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: []
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ) => {
    // Parameter normalization
    const normalizedMessage = message || '';
    const normalizedButtons = buttons?.length ? buttons : [{ 
      text: 'OK',
      onPress: () => {}
    }];

    if (Platform.OS === 'web') {
      // Web: Use internal modal
      setAlertState({
        visible: true,
        title,
        message: normalizedMessage,
        buttons: normalizedButtons
      });
    } else {
      // Mobile: Use native Alert.alert
      const alertButtons = normalizedButtons.map(button => ({
        text: button.text,
        onPress: button.onPress,
        style: button.style
      }));
      
      Alert.alert(title, normalizedMessage, alertButtons);
    }
  };

  const contextValue: AlertContextType = {
    showAlert
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
    </AlertContext.Provider>
  );
}

// useAlertContext Hook - internal use
export function useAlertContext(): AlertContextType {
  const context = useContext(AlertContext);
  
  if (context === undefined) {
    throw new Error('useAlertContext must be used within an AlertProvider');
  }
  
  return context;
}

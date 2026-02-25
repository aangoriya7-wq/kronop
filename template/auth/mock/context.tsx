// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser } from '../types';
import { mockAuthService } from './service';

interface MockAuthContextState {
  user: AuthUser | null;
  loading: boolean;
  operationLoading: boolean;
  initialized: boolean;
}

interface MockAuthContextActions {
  setOperationLoading: (loading: boolean) => void;
}

type MockAuthContextType = MockAuthContextState & MockAuthContextActions;

const MockAuthContext = createContext<MockAuthContextType | undefined>(undefined);

interface MockAuthProviderProps {
  children: ReactNode;
}

export function MockAuthProvider({ children }: MockAuthProviderProps) {
  const [state, setState] = useState<MockAuthContextState>({
    user: null,
    loading: true,
    operationLoading: false,
    initialized: false,
  });

  const updateState = (updates: Partial<MockAuthContextState>) => {
    setState(prevState => {
      const newState = { ...prevState, ...updates };
      return newState;
    });
  };

  const setOperationLoading = (loading: boolean) => {
    updateState({ operationLoading: loading });
  };

  useEffect(() => {
    let isMounted = true;
    let authSubscription: any = null;

    const initializeMockAuth = async () => {      
      try {
        const currentUser = await mockAuthService.getCurrentUser();
        
        if (isMounted) {
          updateState({ 
            user: currentUser, 
            loading: false, 
            initialized: true 
          });
        }
        
        // Removed onAuthStateChange subscription as part of cleanup

      } catch (error) {
        console.warn('[SDK:MockAuthProvider] Mock auth initialization failed:', error);
        if (isMounted) {
          updateState({ 
            user: null, 
            loading: false, 
            initialized: true 
          });
        }
      }
    };

    initializeMockAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const contextValue: MockAuthContextType = {
    ...state,
    setOperationLoading,
  };

  return (
    <MockAuthContext.Provider value={contextValue}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useMockAuthContext(): MockAuthContextType {
  const context = useContext(MockAuthContext);
  
  if (context === undefined) {
    throw new Error('useMockAuthContext must be used within a MockAuthProvider');
  }
  
  return context;
}

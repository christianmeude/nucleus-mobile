import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRIVACY_STORAGE_KEY = '@nucleus_privacy_accepted';

interface PrivacyContextType {
  isPrivacyAccepted: boolean;
  isLoading: boolean;
  acceptPrivacy: () => Promise<void>;
  resetPrivacy: () => Promise<void>;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const PrivacyProvider = ({ children }: { children: ReactNode }) => {
  const [isPrivacyAccepted, setIsPrivacyAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPrivacyStatus = async () => {
      try {
        const value = await AsyncStorage.getItem(PRIVACY_STORAGE_KEY);
        if (value === 'true') {
          setIsPrivacyAccepted(true);
        }
      } catch (e) {
        // Silent catch
      } finally {
        setIsLoading(false);
      }
    };
    loadPrivacyStatus();
  }, []);

  const acceptPrivacy = async () => {
    try {
      await AsyncStorage.setItem(PRIVACY_STORAGE_KEY, 'true');
      setIsPrivacyAccepted(true);
    } catch (e) {
      console.error('Failed to save privacy acceptance:', e);
    }
  };

  const resetPrivacy = async () => {
    try {
      await AsyncStorage.removeItem(PRIVACY_STORAGE_KEY);
      setIsPrivacyAccepted(false);
    } catch (e) {
      console.error('Failed to reset privacy acceptance:', e);
    }
  };

  return (
    <PrivacyContext.Provider value={{ isPrivacyAccepted, isLoading, acceptPrivacy, resetPrivacy }}>
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};

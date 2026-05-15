import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UIContext = createContext(null);

/**
 * UIProvider manages global interface states that require instant 
 * feedback, such as pre-navigation loading and global interaction locks.
 */
export const UIProvider = ({ children }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [loadingKey, setLoadingKey] = useState(0);

  const startLoading = useCallback(() => {
    setIsNavigating(true);
    setLoadingKey(prev => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setIsNavigating(false);
  }, []);

  const value = {
    isNavigating,
    loadingKey,
    startLoading,
    stopLoading
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};

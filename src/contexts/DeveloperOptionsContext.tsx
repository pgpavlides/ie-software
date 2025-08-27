import React, { createContext, useContext, useState } from 'react';

interface DeveloperOptionsContextType {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
}

const DeveloperOptionsContext = createContext<DeveloperOptionsContextType | undefined>(undefined);

export const DeveloperOptionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState(false);

  return (
    <DeveloperOptionsContext.Provider value={{ isEnabled, setIsEnabled }}>
      {children}
    </DeveloperOptionsContext.Provider>
  );
};

export const useDeveloperOptions = () => {
  const context = useContext(DeveloperOptionsContext);
  if (context === undefined) {
    throw new Error('useDeveloperOptions must be used within a DeveloperOptionsProvider');
  }
  return context;
};
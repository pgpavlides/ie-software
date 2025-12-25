import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  username: string;
  role: string;
  displayName: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Define all users
  const users: User[] = [
    {
      username: import.meta.env.VITE_USER1_USERNAME || 'Dim',
      role: 'Administrator',
      displayName: 'Dim'
    },
    {
      username: import.meta.env.VITE_USER2_USERNAME || 'Kos',
      role: 'Manager',
      displayName: 'Kos'
    },
    {
      username: import.meta.env.VITE_USER3_USERNAME || 'Greg',
      role: 'Developer',
      displayName: 'Greg'
    },
    {
      username: import.meta.env.VITE_USER4_USERNAME || 'Broc',
      role: 'Technician',
      displayName: 'Broc'
    }
  ];

  const passwords = [
    import.meta.env.VITE_USER1_PASSWORD || 'dim123',
    import.meta.env.VITE_USER2_PASSWORD || 'kos123',
    import.meta.env.VITE_USER3_PASSWORD || 'greg123',
    import.meta.env.VITE_USER4_PASSWORD || 'broc123'
  ];

  useEffect(() => {
    // Check if user was previously authenticated
    const authStatus = localStorage.getItem('isAuthenticated');
    const savedUser = localStorage.getItem('currentUser');
    if (authStatus === 'true' && savedUser) {
      setIsAuthenticated(true);
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    // Find user by username and validate password
    const userIndex = users.findIndex(user => user.username === username);
    
    if (userIndex !== -1 && passwords[userIndex] === password) {
      const user = users[userIndex];
      setIsAuthenticated(true);
      setCurrentUser(user);
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
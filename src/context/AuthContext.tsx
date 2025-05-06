import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
// em /src/config.ts ou logo no topo do AuthContext.tsx
export const API_BASE = import.meta.env.DEV
  ? 'http://177.153.62.236:5678/'
  : ''; // em prod ficará vazio → usa path relativo e o vercel.json proxya


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

interface User {
  id: number;
  username: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored user session on initial load
    const storedUser = localStorage.getItem('europa_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing stored user', e);
        localStorage.removeItem('europa_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    console.log('[AuthContext] login called with:', { username, password });
    
    try {
      const response = await fetch(`${API_BASE}/webhook/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: username, senha: password }),
      });
      console.log('[AuthContext] response status:', response.status);
      if (!response.ok) {
        let message = 'Invalid username or password';
        try {
          const errData = await response.json();
          if (errData?.message) message = errData.message;
        } catch {}
        setError(message);
        setIsLoading(false);
        return false;
      }
      const data = await response.json();
      console.log('[AuthContext] login response data:', data);
      const userData: User = { id: data.id, username: data.login };
      setUser(userData);
      localStorage.setItem('europa_user', JSON.stringify(userData));
      setIsLoading(false);
      return true;
    } catch (err) {
      setError('An error occurred during login');
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('europa_user');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
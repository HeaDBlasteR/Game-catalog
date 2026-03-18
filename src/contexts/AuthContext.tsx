import React, { createContext, useState, useContext } from 'react';
import { toUserErrorMessage } from '../shared/feedback';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (username: string, password: string): Promise<User> => {
    try {
      const userData = await window.electronAPI.login(username, password);
      setUser(userData);
      return userData;
    } catch (err: any) {
      throw new Error(toUserErrorMessage(err, 'Не удалось войти в систему.'));
    }
  };

  const register = async (username: string, password: string): Promise<User> => {
    try {
      const userData = await window.electronAPI.register(username, password);
      setUser(userData);
      return userData;
    } catch (err: any) {
      throw new Error(toUserErrorMessage(err, 'Не удалось зарегистрироваться.'));
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
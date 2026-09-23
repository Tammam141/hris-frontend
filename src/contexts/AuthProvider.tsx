import { useState, ReactNode, useCallback } from 'react';
import { User } from '../types/user';
import { AuthContext } from './AuthContext';
import { clearSession } from '../utils/session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      return JSON.parse(savedUser);
    }
    return null;
  });

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await clearSession();
  }, []);

  const hasFeature = useCallback((code: string): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.features?.includes(code) || false;
  }, [user]);

  const refreshUser = useCallback((newUser: User) => {
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: user,
        token: token,
        isAuthenticated: token !== null,
        login: login,
        logout: logout,
        hasFeature: hasFeature,
        refreshUser: refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

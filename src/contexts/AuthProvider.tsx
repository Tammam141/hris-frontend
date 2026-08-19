import { useState, ReactNode } from 'react';
import { User } from '../types/user';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      return JSON.parse(savedUser);
    }
    return null;
  });

  function login(newToken: string, newUser: User) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  function hasFeature(code: string): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.features?.includes(code) || false;
  }

  return (
    <AuthContext.Provider
      value={{
        user: user,
        token: token,
        isAuthenticated: token !== null,
        login: login,
        logout: logout,
        hasFeature: hasFeature,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

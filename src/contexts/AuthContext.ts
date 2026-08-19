import { createContext } from 'react';
import { User } from '../types/user';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasFeature: (code: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { jwtDecode } from './jwtDecode';

interface AuthUser {
  userId: string;
  username: string;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, displayName: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      try {
        const decoded = jwtDecode(stored);
        setUser(decoded);
        setToken(stored);
      } catch {
        localStorage.removeItem('token');
      }
    }
  }, []);

  const loginFn = (newToken: string, displayName: string) => {
    localStorage.setItem('token', newToken);
    const decoded = jwtDecode(newToken);
    decoded.displayName = displayName;
    setUser(decoded);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login: loginFn, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

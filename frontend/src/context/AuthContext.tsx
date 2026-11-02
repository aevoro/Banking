import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { LoginPayload, RegisterPayload, User } from '@/types';
import { api } from '@/services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMockMode: boolean;
  isLiveConnected: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  authModalMode: 'login' | 'register';
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  toggleMockMode: (enabled: boolean) => void;
  refreshHealth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [isMockMode, setIsMockMode] = useState<boolean>(() => api.isMockMode());

  // Auth modal control
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const refreshHealth = useCallback(async () => {
    const isLive = await api.checkHealth();
    setIsLiveConnected(isLive);
    setIsMockMode(api.isMockMode());
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await refreshHealth();
        const token = api.getToken();
        const savedUserJson = localStorage.getItem('bnkg_active_user');

        if (token) {
          try {
            // Verify session with real Go backend
            await api.getAccount();
            if (savedUserJson) {
              const parsedUser = JSON.parse(savedUserJson);
              setUser(parsedUser);
            }
          } catch {
            api.clearToken();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshHealth]);

  const login = async (payload: LoginPayload) => {
    setIsLoading(true);
    try {
      const authData = await api.login(payload);
      setUser(authData.user);
      localStorage.setItem('bnkg_active_user', JSON.stringify(authData.user));
      closeAuthModal();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    try {
      const authData = await api.register(payload);
      setUser(authData.user);
      localStorage.setItem('bnkg_active_user', JSON.stringify(authData.user));
      closeAuthModal();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.clearToken();
    localStorage.removeItem('bnkg_active_user');
    setUser(null);
  };

  const toggleMockMode = (enabled: boolean) => {
    api.setForceMock(enabled);
    setIsMockMode(enabled);
    refreshHealth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isMockMode,
        isLiveConnected,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        authModalMode,
        login,
        register,
        logout,
        toggleMockMode,
        refreshHealth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

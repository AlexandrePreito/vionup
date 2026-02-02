'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'master' | 'group_admin' | 'company_admin' | 'user';
  company_group_id?: string;
  company_group?: {
    id: string;
    name: string;
  };
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Verificar sessão ao carregar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedUser = localStorage.getItem('meta10_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Erro ao fazer login' };
      }

      setUser(data.user);
      localStorage.setItem('meta10_user', JSON.stringify(data.user));
      return { success: true };
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro de conexão' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('meta10_user');
    router.push('/login');
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          currentPassword, 
          newPassword 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Erro ao alterar senha' };
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      return { success: false, error: 'Erro de conexão' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

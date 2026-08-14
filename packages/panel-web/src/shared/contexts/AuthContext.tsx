import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, type UsuarioSesion } from '@/shared/services/api';

interface AuthContextType {
  user: UsuarioSesion | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: UsuarioSesion) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // AuthProvider vive dentro del QueryClientProvider, así que puede vaciar la
  // caché al cambiar de sesión. Es importante: sin esto lo que quedó cacheado de
  // una persona lo ve la siguiente que entra en la misma pestaña (la caché vive
  // mientras viva la página, y cerrar sesión no recarga nada).
  const queryClient = useQueryClient();

  const [user, setUser] = useState<UsuarioSesion | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const response = await authApi.login({ email, password });
        const { user: userData, accessToken, refreshToken } = response;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        // Arrancar en limpio: nada de lo que consultó la sesión anterior sirve
        // —ni es de esta persona— aunque todavía figure como fresco.
        queryClient.clear();
        setUser(userData);
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authApi.logout();
      }
    } catch {
      // Ignorar errores de logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      queryClient.clear();
      setUser(null);
    }
  }, [queryClient]);

  const updateUser = useCallback((updatedUser: UsuarioSesion) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
      }}
    >
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

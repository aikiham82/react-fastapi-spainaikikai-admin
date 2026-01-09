import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthRequest, AuthResponse, RegisterRequest, CurrentUser, UserRole } from '../data/auth.schema';
import { jwtDecode } from 'jwt-decode';
import { useLoginMutation } from './mutations/useLogin.mutation';
import { useLogoutMutation } from './mutations/useLogout.mutation';

import { appStorage } from '@/core/data/appStorage';
import { useRegisterMutation } from './mutations/useRegister.mutation';
import { getCurrentUser } from '../data/auth.service';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  isLoading: boolean;
  loginWithJWT: () => Promise<void>;
  registerUser: (data: RegisterRequest) => Promise<void>;
  auth: AuthResponse | null;
  login: (data: AuthRequest) => Promise<void>;
  logout: () => void;
  getJwt: () => string | null;
  currentUser: CurrentUser | null;
  userRole: UserRole;
  clubId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('user_email'));
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const sessionExpiration = localStorage.getItem('session_expiration');
    if (sessionExpiration) {
      const expirationDate = new Date(sessionExpiration);
      return expirationDate > new Date();
    }
    return false;
  });

  const { login: loginMutation, isLoading: isLoggingIn, error: loginError } = useLoginMutation();
  const { logout: logoutMutation, isLoading: isLoggingOut } = useLogoutMutation();
  const { registerMutation, isPending: isRegistering, error: registerError } = useRegisterMutation();

  const { data: currentUserData, refetch: refetchCurrentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (currentUserData) {
      setCurrentUser(currentUserData);
      localStorage.setItem('user_role', currentUserData.role || '');
      if (currentUserData.club_id) {
        localStorage.setItem('club_id', currentUserData.club_id);
      } else {
        localStorage.removeItem('club_id');
      }
    }
  }, [currentUserData]);

  const userRole: UserRole = currentUser?.role || null;
  const clubId: string | null = currentUser?.club_id || null;

  useEffect(() => {
    const err = registerError || loginError;
    if (err) {
      toast('An error occurred during register');
    }
  }, [registerError || loginError]);

  const loginWithJWT = async () => {
    try {
      if (!auth) return;
      const decoded = jwtDecode(auth.access_token) as { exp?: number; sub?: string };
      const { exp, sub } = decoded;
      if (!exp) return;
      const expirationDate = new Date(exp * 1000);
      localStorage.setItem('session_expiration', expirationDate.toISOString());
      localStorage.setItem('user_email', sub || '');
      appStorage().local.setString('access_token', auth.access_token);
      setIsAuthenticated(true);
      setUserEmail(sub || null);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'An error occurred during login with JWT');
    }
  };

  const registerUser = async (data: RegisterRequest) => {
    try {
      registerMutation(data, {
        onSuccess: (response) => {
          setAuth(response);
          const { access_token } = response;
          const decoded = jwtDecode(access_token) as { exp?: number; sub?: string };
          const { exp, sub } = decoded;
          if (exp) {
            const expirationDate = new Date(exp * 1000);
            localStorage.setItem('session_expiration', expirationDate.toISOString());
          }
          localStorage.setItem('user_email', sub || '');
          appStorage().local.setString('access_token', access_token);
          setUserEmail(sub || null);
          setIsAuthenticated(true);
          refetchCurrentUser();
        },
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'An error occurred during register');
    }
  };

  const login = async (data: AuthRequest) => {
    try {
      loginMutation(data, {
        onSuccess: (response) => {
          setAuth(response);
          const { access_token } = response;
          const decoded = jwtDecode(access_token) as { exp?: number; sub?: string };
          const { exp, sub } = decoded;
          if (exp) {
            const expirationDate = new Date(exp * 1000);
            localStorage.setItem('session_expiration', expirationDate.toISOString());
          }
          localStorage.setItem('user_email', sub || '');
          appStorage().local.setString('access_token', access_token);
          setUserEmail(sub || null);
          setIsAuthenticated(true);
          refetchCurrentUser();
        },
      });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'An error occurred during login');
    }
  };

  const logout = async () => {
    try {
      setUserEmail(null);
      setIsAuthenticated(false);
      setAuth(null);
      setCurrentUser(null);

      const { local, session } = appStorage();
      local.clear();
      session.clear();

      localStorage.removeItem('session_expiration');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_role');
      localStorage.removeItem('club_id');

      await logoutMutation();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'An error occurred during logout');
    }
  };

  const getJwt = (): string | null => appStorage().local.getString('access_token');

  return (
      <AuthContext.Provider
        value={{
          isAuthenticated,
          userEmail,
          isLoading: isLoggingIn || isLoggingOut || isRegistering,
          loginWithJWT,
          registerUser,
          auth,
          login,
          logout,
          getJwt,
          currentUser,
          userRole,
          clubId
        }}
      >
        {children}
      </AuthContext.Provider>
    );
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

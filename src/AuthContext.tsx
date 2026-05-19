import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase, login as doLogin, logout as doLogout, parseUser, setCurrentToken, type AuthUser } from './auth';
import type { Session } from '@supabase/supabase-js';

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  loggedIn: boolean;
  isAdmin: boolean;
  isCompany: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(parseUser(s?.user ?? null));
      setCurrentToken(s?.access_token ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(parseUser(s?.user ?? null));
      setCurrentToken(s?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await doLogin(email, password);
    // onAuthStateChange above will update state automatically
  }, []);

  const logout = useCallback(async () => {
    await doLogout();
    // onAuthStateChange will clear state
  }, []);

  if (loading) return null; // wait for session restore before rendering

  const roles = user?.roles ?? [];
  return (
    <AuthContext.Provider value={{
      user,
      session,
      loggedIn: !!session,
      isAdmin: roles.includes('ADMIN'),
      isCompany: roles.includes('COMPANY'),
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

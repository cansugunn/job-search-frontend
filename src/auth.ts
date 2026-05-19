import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}

// Module-level token cache — updated by AuthContext via onAuthStateChange
let _currentToken: string | null = null;

export function setCurrentToken(token: string | null) {
  _currentToken = token;
}

export function getAccessToken(): string | null {
  return _currentToken;
}

export function parseUser(supabaseUser: { id: string; email?: string; app_metadata?: Record<string, unknown> } | null): AuthUser | null {
  if (!supabaseUser) return null;
  const roles = (supabaseUser.app_metadata?.roles as string[]) ?? ['USER'];
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? '',
    roles,
  };
}

export async function login(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
  setCurrentToken(null);
}

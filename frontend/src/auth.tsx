import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type User = { id: number; display_name: string };

type Auth = {
  user: User | null;
  loading: boolean;
  authenticate: (mode: 'login' | 'signup', fields: object) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function restore() {
      try {
        const response = await fetch('/api/users/me', { signal: controller.signal });
        if (response.ok) {
          const currentUser: User = await response.json();
          if (!controller.signal.aborted) setUser(currentUser);
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error('Could not restore session', error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void restore();
    return () => controller.abort();
  }, []);

  async function authenticate(mode: 'login' | 'signup', fields: object) {
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.error ?? 'Could not sign in.');
    }
    setUser(await response.json());
  }

  async function logout() {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) throw new Error('Could not sign out.');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, authenticate, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider is required');
  return auth;
}
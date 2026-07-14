import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AuthUser } from "@/lib/navigation";
import api from "@/lib/api";

const STORAGE_KEY = "unza-user";
const REFRESH_TOKEN_KEY = "unza-refresh-token";
const REFRESH_AHEAD_MS = 120_000; // refresh 2 min before expiry

type AuthContextValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (user: AuthUser, refreshToken?: string) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  logout: () => void;
  completePasswordChange: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((expiresAt: string, refreshToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const expiresMs = new Date(expiresAt).getTime();
    const delay = expiresMs - Date.now() - REFRESH_AHEAD_MS;
    if (delay <= 0) return;
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.auth.refresh(refreshToken);
        const newExpiry = new Date(Date.now() + (res.expiresIn ?? 900) * 1000).toISOString();
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, accessToken: res.accessToken, expiresAt: newExpiry };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          return next;
        });
        if (res.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
          scheduleRefresh(newExpiry, res.refreshToken);
        }
      } catch {
        // Refresh failed — let the 401 handler clear the session naturally
      }
    }, delay);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed: AuthUser | null = stored ? JSON.parse(stored) : null;
      setUser(parsed);
      if (parsed?.expiresAt) {
        const rt = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (rt) scheduleRefresh(parsed.expiresAt, rt);
      }
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, [scheduleRefresh]);

  useEffect(() => {
    const handleLogout = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
    };
    window.addEventListener("unza:auth:logout", handleLogout);
    return () => window.removeEventListener("unza:auth:logout", handleLogout);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    ready,
    login: (nextUser, refreshToken) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      setUser(nextUser);
      if (nextUser.expiresAt && refreshToken) scheduleRefresh(nextUser.expiresAt, refreshToken);
    },
    updateUser: (partialUser) => {
      setUser((prev) => {
        if (!prev) return prev;
        const nextUser = { ...prev, ...partialUser };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        return nextUser;
      });
    },
    completePasswordChange: () => {
      setUser((prev) => {
        if (!prev) return prev;
        const nextUser = { ...prev, forcePasswordChange: false };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        return nextUser;
      });
    },
    logout: () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      const rt = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (rt) api.auth.logout(rt).catch(() => {});
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
    },
  }), [ready, user, scheduleRefresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

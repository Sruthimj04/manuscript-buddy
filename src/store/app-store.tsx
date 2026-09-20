import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as service from "@/services/manuscriptService";
import * as erpnext from "@/services/erpnextClient";
import type { Manuscript, Role, User, AuthStatus } from "@/services/types";

interface AppState {
  user: User | null;
  role: Role | null;
  authStatus: AuthStatus;
  manuscripts: Manuscript[];
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, role: Role) => Promise<void>;
  setAuthSession: (token: string, userData: User) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

function resolveRole(roles: string[]): Role {
  if (roles.includes("Manuscript Admin") || roles.includes("System Manager")) return "admin";
  if (roles.includes("Manuscript Editor")) return "editor";
  return "author";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setManuscripts(await service.listManuscripts());
      setError(null);
    } catch {
      setError("Unable to load manuscripts. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  const setAuthSession = useCallback((token: string, userData: User) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
    setUser(userData);
    setAuthStatus("authenticated");
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
          setUser(null);
          setAuthStatus("unauthenticated");
          return;
        }

        const info = await erpnext.getUserInfo();
        if (info) {
          setUser({
            name: info.name,
            email: info.email,
            role: resolveRole(info.roles),
          });
          setAuthStatus("authenticated");
        } else {
          if (typeof window !== "undefined") localStorage.removeItem("token");
          setUser(null);
          setAuthStatus("unauthenticated");
        }
      } catch {
        if (typeof window !== "undefined") localStorage.removeItem("token");
        setUser(null);
        setAuthStatus("unauthenticated");
      } finally {
        setLoading(false);
      }
    }
    void checkSession();
  }, []);

  // Refresh manuscripts when user logs in
  useEffect(() => {
    if (user && authStatus === "authenticated") void refresh();
  }, [user, authStatus, refresh]);

  const login = useCallback(async (email: string, password: string, role: Role) => {
    setLoading(true);
    try {
      await erpnext.login(email, password);
      const info = await erpnext.getUserInfo();
      if (info) {
        setUser({
          name: info.name,
          email: info.email,
          role: role || resolveRole(info.roles),
        });
        setAuthStatus("authenticated");
      }
      setError(null);
    } catch (e) {
      if (typeof window !== "undefined") localStorage.removeItem("token");
      setUser(null);
      setAuthStatus("unauthenticated");
      const message = e instanceof Error ? e.message : "Login failed";
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await erpnext.logout();
    } catch {
      // Ignore logout errors
    }
    if (typeof window !== "undefined") localStorage.removeItem("token");
    setUser(null);
    setAuthStatus("unauthenticated");
    setManuscripts([]);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      user,
      role: user?.role ?? null,
      authStatus,
      manuscripts,
      loading,
      error,
      login,
      setAuthSession,
      logout,
      refresh,
    }),
    [user, authStatus, manuscripts, loading, error, login, setAuthSession, logout, refresh],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
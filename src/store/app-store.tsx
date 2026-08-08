import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as service from "@/services/manuscriptService";
import * as erpnext from "@/services/erpnextClient";
import type { Manuscript, Role, User } from "@/services/types";

interface AppState {
  user: User | null;
  role: Role | null;
  manuscripts: Manuscript[];
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

/**
 * Map ERPNext roles to frontend role keys.
 * Adjust role names to match your Frappe role setup.
 */
function resolveRole(roles: string[]): Role {
  if (roles.includes("Manuscript Admin") || roles.includes("System Manager")) return "admin";
  if (roles.includes("Manuscript Editor")) return "editor";
  return "author";
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
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

  // Check for existing session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const info = await erpnext.getUserInfo();
        if (info) {
          setUser({
            name: info.name,
            email: info.email,
            role: resolveRole(info.roles),
          });
        }
      } catch {
        // No active session — stay on login page
      } finally {
        setLoading(false);
      }
    }
    void checkSession();
  }, []);

  // Refresh manuscripts when user logs in
  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  const login = useCallback(async (email: string, password: string, role: Role) => {
    setLoading(true);
    try {
      await erpnext.login(email, password);
      const info = await erpnext.getUserInfo();
      if (info) {
        // If user selected a specific role, use it; otherwise derive from Frappe roles
        setUser({
          name: info.name,
          email: info.email,
          role: role || resolveRole(info.roles),
        });
      }
      setError(null);
    } catch (e) {
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
    setUser(null);
    setManuscripts([]);
  }, []);

  const value = useMemo<AppState>(
    () => ({
      user,
      role: user?.role ?? null,
      manuscripts,
      loading,
      error,
      login,
      logout,
      refresh,
    }),
    [user, manuscripts, loading, error, login, logout, refresh],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
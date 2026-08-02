import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as service from "@/services/manuscriptService";
import type { Manuscript, Role, User } from "@/services/types";

interface AppState {
  user: User | null;
  role: Role;
  manuscripts: Manuscript[];
  loading: boolean;
  error: string | null;
  login: (user: User) => void;
  logout: () => void;
  setRole: (role: Role) => void;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const DEFAULT_USER: User = { name: "Amara Nwosu", email: "amara@lorempress.co", role: "author" };

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>("author");
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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AppState>(
    () => ({
      user: user ?? DEFAULT_USER,
      role,
      manuscripts,
      loading,
      error,
      login: (u) => {
        setUser(u);
        setRole(u.role);
      },
      logout: () => setUser(null),
      setRole,
      refresh,
    }),
    [user, role, manuscripts, loading, error, refresh],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
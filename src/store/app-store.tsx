import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as service from "@/services/manuscriptService";
import type { Manuscript, Role, User } from "@/services/types";

interface AppState {
  user: User | null;
  role: Role | null;
  manuscripts: Manuscript[];
  loading: boolean;
  error: string | null;
  login: (user: User) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

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

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AppState>(
    () => ({
      user,
      role: user?.role ?? null,
      manuscripts,
      loading,
      error,
      login: (u: User) => setUser(u),
      logout: () => setUser(null),
      refresh,
    }),
    [user, manuscripts, loading, error, refresh],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
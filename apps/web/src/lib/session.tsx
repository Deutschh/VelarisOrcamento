import type { AuthUser } from "@velaris/shared";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { apiRequest } from "./api.js";

type SessionStatus = "authenticated" | "guest" | "loading";

interface SessionContextValue {
  status: SessionStatus;
  user: AuthUser | null;
  refreshSession: () => Promise<void>;
  setAuthenticatedUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const refreshSession = useCallback(async () => {
    try {
      const response = await apiRequest<{ user: AuthUser }>(
        "/api/auth/refresh",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
        { retryOnUnauthorized: false },
      );

      setUser(response.user);
      setStatus("authenticated");
    } catch {
      setUser(null);
      setStatus("guest");
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const setAuthenticatedUser = useCallback(
    (nextUser: AuthUser) => {
      setUser(nextUser);
      setStatus("authenticated");
      void queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>(
        "/api/auth/logout",
        {
          method: "POST",
          body: JSON.stringify({}),
        },
        { retryOnUnauthorized: false },
      );
    } finally {
      setUser(null);
      setStatus("guest");
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo(
    () => ({
      status,
      user,
      refreshSession,
      setAuthenticatedUser,
      logout,
    }),
    [logout, refreshSession, setAuthenticatedUser, status, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error("useSession must be used inside SessionProvider.");
  }

  return session;
}

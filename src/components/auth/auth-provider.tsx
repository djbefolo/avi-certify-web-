"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import { observeAuthState, signOutUser } from "@/lib/firebase/auth";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  reloadUser: () => Promise<User | null>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = observeAuthState((currentUser) => {
      setUser(currentUser);
      setIsEmailVerified(Boolean(currentUser?.emailVerified));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const reloadUser = useCallback(async () => {
    if (!user) {
      return null;
    }

    await user.reload();
    await user.getIdToken(true);
    setIsEmailVerified(user.emailVerified);

    return user;
  }, [user]);

  const logout = useCallback(async () => {
    await signOutUser();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isEmailVerified,
      reloadUser,
      logout,
    }),
    [isEmailVerified, loading, logout, reloadUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

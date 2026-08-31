import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { User } from "@workspace/api-client-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);
  const queryClient = useQueryClient();

  // Check Supabase session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      setInitialCheckDone(true);
    };
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
      if (!session) {
        setUserState(null);
        queryClient.setQueryData(getGetMeQueryKey(), null);
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const { data: meData, isLoading, isError } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
      enabled: hasSession && initialCheckDone,
    } as any
  });

  useEffect(() => {
    if (meData) {
      setUserState(meData);
    }
  }, [meData]);

  useEffect(() => {
    if (isError) {
      setUserState(null);
      queryClient.setQueryData(getGetMeQueryKey(), null);
      sessionStorage.setItem("quantex_auth_message", "Your session has expired. Please log in again.");
    }
  }, [isError, queryClient]);

  const setUser = (newUser: User | null, _token?: string) => {
    setUserState(newUser);
    if (!newUser) {
      queryClient.setQueryData(getGetMeQueryKey(), null);
    } else {
      queryClient.setQueryData(getGetMeQueryKey(), newUser);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUserState(null);
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
  };

  const isLoadingAuth = !initialCheckDone || isLoading;

  return (
    <AuthContext.Provider value={{ user, isLoading: isLoadingAuth, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

import React, { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { User } from "@workspace/api-client-react";
import { useGetMe, getGetMeQueryKey, setAuthTokenGetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getStoredToken, storeToken, clearToken } from "./token";

setAuthTokenGetter(() => getStoredToken());

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data: meData, isLoading } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
      enabled: !!getStoredToken(),
    } as any
  });

  useEffect(() => {
    if (meData) {
      setUserState(meData);
    }
  }, [meData]);

  const setUser = (newUser: User | null, token?: string) => {
    setUserState(newUser);
    if (!newUser) {
      clearToken();
      queryClient.setQueryData(getGetMeQueryKey(), null);
    } else {
      if (token) storeToken(token);
      queryClient.setQueryData(getGetMeQueryKey(), newUser);
    }
  };

  const logout = () => {
    setUserState(null);
    clearToken();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, logout }}>
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

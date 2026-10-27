import React, { useContext, createContext, type PropsWithChildren } from "react";
import { useStorageState } from "@/core/storage";
import type { UserMe } from "../auth.schema";

interface AuthContextValue {
  signIn: (token: string, user: UserMe) => void;
  signOut: () => void;
  session: string | null;
  user: UserMe | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  signIn: () => {},
  signOut: () => {},
  session: null,
  user: null,
  isLoading: true,
});

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within a SessionProvider");
  }
  return value;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [[isLoading, session], setSession] = useStorageState("session");
  const [[_isUserLoading, userJson], setUserJson] =
    useStorageState("user");

  const user: UserMe | null = React.useMemo(() => {
    if (!userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }, [userJson]);

  const signIn = React.useCallback(
    (token: string, userData: UserMe) => {
      setSession(token);
      setUserJson(JSON.stringify(userData));
    },
    [setSession, setUserJson]
  );

  const signOut = React.useCallback(() => {
    setSession(null);
    setUserJson(null);
  }, [setSession, setUserJson]);

  return React.createElement(
    AuthContext.Provider,
    {
      value: { signIn, signOut, session, user, isLoading },
    },
    children
  );
}

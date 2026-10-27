import React, { useContext, createContext, type PropsWithChildren } from "react";
import { useStorageState } from "@/core/storage";
import { getCurrentUser } from "../auth.service";
import type { UserMe } from "../auth.schema";

interface AuthContextValue {
  signIn: (token: string, user: UserMe) => void;
  signOut: () => void;
  refuseClubAccount: () => void;
  clubAccountRefused: boolean;
  session: string | null;
  user: UserMe | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  signIn: () => {},
  signOut: () => {},
  refuseClubAccount: () => {},
  clubAccountRefused: false,
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
  const [clubAccountRefused, setClubAccountRefused] = React.useState(false);

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
      setClubAccountRefused(false);
      setSession(token);
      setUserJson(JSON.stringify(userData));
    },
    [setSession, setUserJson]
  );

  const signOut = React.useCallback(() => {
    setSession(null);
    setUserJson(null);
  }, [setSession, setUserJson]);

  const refuseClubAccount = React.useCallback(() => {
    signOut();
    setClubAccountRefused(true);
  }, [signOut]);

  React.useEffect(() => {
    if (isLoading || !session || user?.is_club_account !== undefined) return;
    getCurrentUser(session)
      .then((current) => {
        if (current.is_club_account) refuseClubAccount();
      })
      .catch((error) => console.error("Could not check the stored session:", error));
    // ponytail: only sessions stored before the club-account check lack the flag; drop this effect once those have expired.
  }, [isLoading]);

  return React.createElement(
    AuthContext.Provider,
    {
      value: { signIn, signOut, refuseClubAccount, clubAccountRefused, session, user, isLoading },
    },
    children
  );
}

import { useCallback, useEffect, useRef } from "react";
import { HandleSSOCallback, useAuth } from "@clerk/react";
import { Loader2 } from "lucide-react";
import { GOOGLE_FAILED_PATH } from "@/core/config/clerk";
import { useAuthContext } from "../hooks/useAuthContext";
import { useSocialLoginMutation } from "../hooks/mutations/useSocialLogin.mutation";

export const SsoCallback = () => {
  const { isSignedIn, getToken, signOut } = useAuth();
  const { startSession } = useAuthContext();
  const { action: exchange } = useSocialLoginMutation();
  const exchanged = useRef(false);
  const fail = useCallback(() => void signOut({ redirectUrl: GOOGLE_FAILED_PATH }), [signOut]);

  useEffect(() => {
    if (!isSignedIn || exchanged.current) return;
    exchanged.current = true;

    void getToken().then((token) => {
      if (!token) return fail();
      exchange(token, {
        onSuccess: (response) => {
          startSession(response);
          void signOut({ redirectUrl: "/" });
        },
        onError: fail,
      });
    }, fail);
  }, [isSignedIn, getToken, signOut, exchange, startSession, fail]);

  return (
    <div className="flex h-screen items-center justify-center">
      <HandleSSOCallback
        navigateToApp={({ session }) => session?.status === "pending" && fail()}
        navigateToSignIn={fail}
        navigateToSignUp={fail}
      />
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Entrando con Google" />
    </div>
  );
};

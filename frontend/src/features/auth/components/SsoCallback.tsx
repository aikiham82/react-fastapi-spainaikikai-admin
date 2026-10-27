import { useCallback, useEffect, useRef } from "react";
import { HandleSSOCallback, useAuth } from "@clerk/react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GOOGLE_FAILED_PATH } from "@/core/config/clerk";

const SSO_CALLBACK_TIMEOUT_MS = 20_000;
import { useAuthContext } from "../hooks/useAuthContext";
import { useSocialLoginMutation } from "../hooks/mutations/useSocialLogin.mutation";

export const SsoCallback = () => {
  const { isSignedIn, getToken, signOut } = useAuth();
  const { startSession } = useAuthContext();
  const { action: exchange } = useSocialLoginMutation();
  const navigate = useNavigate();
  const exchanged = useRef(false);
  const fail = useCallback(() => void signOut({ redirectUrl: GOOGLE_FAILED_PATH }), [signOut]);

  useEffect(() => {
    const giveUp = setTimeout(() => {
      if (!exchanged.current) navigate(GOOGLE_FAILED_PATH, { replace: true });
    }, SSO_CALLBACK_TIMEOUT_MS);
    return () => clearTimeout(giveUp);
  }, [navigate]);

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

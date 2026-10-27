import { useCallback, useEffect, useRef } from "react";
import { HandleSSOCallback, useAuth } from "@clerk/react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GOOGLE_FAILED_PATH } from "@/core/config/clerk";
import { useAuthContext } from "../hooks/useAuthContext";
import { useSocialLoginMutation } from "../hooks/mutations/useSocialLogin.mutation";

const SSO_CALLBACK_TIMEOUT_MS = 20_000;

export const SsoCallback = () => {
  const { isSignedIn, getToken, signOut } = useAuth();
  const { startSession } = useAuthContext();
  const { action: exchange } = useSocialLoginMutation();
  const navigate = useNavigate();
  const exchanged = useRef(false);
  const leaveClerkTo = useCallback(
    (path: string) => void signOut(() => navigate(path, { replace: true })),
    [signOut, navigate]
  );
  const fail = useCallback(() => leaveClerkTo(GOOGLE_FAILED_PATH), [leaveClerkTo]);

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
          leaveClerkTo("/");
        },
        onError: fail,
      });
    }, fail);
  }, [isSignedIn, getToken, exchange, startSession, fail, leaveClerkTo]);

  return (
    <div className="flex h-screen items-center justify-center" role="status">
      <HandleSSOCallback
        navigateToApp={({ session }) => session?.status === "pending" && fail()}
        navigateToSignIn={fail}
        navigateToSignUp={fail}
      />
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Entrando con Google</span>
    </div>
  );
};

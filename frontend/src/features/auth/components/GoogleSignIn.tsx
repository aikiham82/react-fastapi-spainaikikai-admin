import { ClerkProvider, useSignIn } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { clerkPublishableKey, GOOGLE_FAILED_PATH, SSO_CALLBACK_PATH } from "@/core/config/clerk";

const GoogleButton = () => {
  const { signIn, fetchStatus } = useSignIn();
  const navigate = useNavigate();

  const start = async () => {
    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: SSO_CALLBACK_PATH,
      redirectCallbackUrl: SSO_CALLBACK_PATH,
    });
    if (error) navigate(GOOGLE_FAILED_PATH, { replace: true });
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      disabled={fetchStatus === "fetching"}
      onClick={start}
    >
      Entrar con Google
    </Button>
  );
};

export const GoogleSignIn = () => {
  if (!clerkPublishableKey) return null;

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <div className="flex items-center gap-3 text-sm text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        o
        <span className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton />
    </ClerkProvider>
  );
};

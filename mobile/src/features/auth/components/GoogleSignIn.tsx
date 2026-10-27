import { useState } from "react";
import { Platform, StyleSheet, Text } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { ClerkProvider, useAuth as useClerkAuth, useSSO } from "@clerk/expo";
import { Button } from "@/components/Button";
import { colors, fonts, spacing } from "@/core/theme";
import { useSocialLoginMutation } from "../hooks/mutations/useSocialLoginMutation";

WebBrowser.maybeCompleteAuthSession();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const signInWithAppleMissing = Platform.OS === "ios";

const GOOGLE_FAILURE_MESSAGE =
  "No hemos podido entrar con Google. Usa el correo con el que tu club te dio acceso.";

function GoogleButton() {
  const { startSSOFlow } = useSSO();
  const { getToken, signOut } = useClerkAuth();
  const exchange = useSocialLoginMutation();
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(false);

  async function signInWithGoogle() {
    setFailed(false);
    setStarting(true);
    try {
      const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (!createdSessionId || !setActive) {
        setFailed(authSessionResult?.type === "success");
        return;
      }

      await setActive({ session: createdSessionId });
      const token = await getToken();
      if (!token) throw new Error("Clerk returned no session token");
      await exchange.mutateAsync(token);
    } catch {
      setFailed(true);
    } finally {
      setStarting(false);
      await signOut().catch(() => {});
    }
  }

  return (
    <>
      {failed && <Text style={styles.error}>{GOOGLE_FAILURE_MESSAGE}</Text>}
      <Button
        title="Entrar con Google"
        variant="outline"
        onPress={signInWithGoogle}
        loading={starting || exchange.isPending}
        style={styles.button}
      />
    </>
  );
}

export function GoogleSignIn() {
  if (!publishableKey || signInWithAppleMissing) return null;

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <GoogleButton />
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  button: {
    marginTop: spacing.md,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.expired,
    textAlign: "center",
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.expiredBg,
    borderRadius: 8,
    overflow: "hidden",
  },
});

import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { requestCardAccess } from "@/features/auth/auth.service";
import { colors, fonts, spacing } from "@/core/theme";

export default function ActivateCardScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const request = useMutation({ mutationFn: requestCardAccess });

  function submit() {
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError("Escribe tu correo, el que tiene tu club en tu ficha");
      return;
    }
    setError(undefined);
    request.mutate(email.trim());
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Activa tu carné</Text>
          {request.isSuccess ? (
            <>
              <Text style={styles.done}>{request.data}</Text>
              <Text style={styles.body}>
                Lo hemos pedido para {email.trim()}. Si no te llega en unos minutos, mira en spam.
              </Text>
              <TouchableOpacity style={styles.link} accessibilityRole="button" onPress={() => request.reset()}>
                <Text style={styles.linkText}>Probar con otro correo</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.body}>
                Escribe el correo que tiene tu club en tu ficha. Te enviaremos un enlace para poner tu contraseña y
                después podrás entrar aquí y ver tu carné.
              </Text>
              <Input
                label="Correo"
                placeholder="tu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                error={error}
              />
              {request.isError && (
                <Text style={styles.failed}>No se ha podido enviar. Inténtalo de nuevo en un momento.</Text>
              )}
              <Button title="Enviar enlace" onPress={submit} loading={request.isPending} style={styles.button} />
            </>
          )}

          <Text style={styles.hint}>
            Si tu ficha no tiene correo, o lo compartes con otra persona, pide a tu club que te ponga el tuyo.
          </Text>

          <TouchableOpacity
            style={styles.link}
            accessibilityRole="link"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/login"))}
          >
            <Text style={styles.linkText}>Volver a entrar</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: "center", padding: spacing.lg },
  title: { fontFamily: fonts.headingBold, fontSize: 26, color: colors.primary, marginBottom: spacing.sm },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.primary, marginBottom: spacing.lg },
  done: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.primary,
    backgroundColor: colors.surfaceCard,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    padding: spacing.md,
    borderRadius: 8,
    overflow: "hidden",
  },
  failed: { fontFamily: fonts.body, fontSize: 14, color: colors.expired, marginBottom: spacing.sm },
  button: { marginTop: spacing.sm },
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.primary, marginTop: spacing.lg },
  link: { alignItems: "center", justifyContent: "center", minHeight: 44, marginTop: spacing.md },
  linkText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.accent },
});

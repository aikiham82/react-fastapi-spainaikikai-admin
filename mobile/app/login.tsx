import { useState, useRef } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useLoginMutation } from "@/features/auth/hooks/mutations/useLoginMutation";
import { colors, fonts, spacing } from "@/core/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const loginMutation = useLoginMutation();

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function validate(): boolean {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = "Email requerido";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email no valido";
    }

    if (!password.trim()) {
      newErrors.password = "Contrasena requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;

    loginMutation.mutate(
      { email: email.trim(), password },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: () => {
          shake();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        },
      }
    );
  }

  const apiError =
    loginMutation.isError
      ? loginMutation.error?.message?.includes("401") ||
        loginMutation.error?.message?.includes("Unauthorized")
        ? "Email o contrasena incorrectos"
        : "Error del servidor, intentalo mas tarde"
      : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require("../assets/logo.jpg")}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.subtitle}>Area de Miembros</Text>
          </View>

          <Animated.View
            style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}
          >
            <Input
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              error={errors.email}
            />

            <Input
              label="Contrasena"
              placeholder="Tu contrasena"
              value={password}
              onChangeText={setPassword}
              isPassword
              autoComplete="password"
              error={errors.password}
            />

            {apiError && <Text style={styles.apiError}>{apiError}</Text>}

            <Button
              title="Acceder"
              onPress={handleLogin}
              loading={loginMutation.isPending}
              style={styles.button}
            />

            <TouchableOpacity style={styles.forgotLink}>
              <Text style={styles.forgotText}>
                Has olvidado tu contrasena?
              </Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <View style={styles.dividerDot} />
              <View style={styles.dividerLine} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  form: {
    marginBottom: spacing.xl,
  },
  apiError: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.expired,
    textAlign: "center",
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.expiredBg,
    borderRadius: 8,
    overflow: "hidden",
  },
  button: {
    marginTop: spacing.sm,
  },
  forgotLink: {
    alignItems: "center",
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  forgotText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  footer: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: 80,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginHorizontal: spacing.sm,
  },
});

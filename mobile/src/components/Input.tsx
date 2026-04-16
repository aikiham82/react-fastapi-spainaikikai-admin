import { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  type TextInputProps,
} from "react-native";
import { colors, fonts, radius, spacing } from "@/core/theme";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  isPassword = false,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>
              {showPassword ? "Ocultar" : "Ver"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputError: {
    borderColor: colors.expired,
  },
  input: {
    flex: 1,
    height: 48,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.primary,
  },
  toggle: {
    paddingLeft: spacing.sm,
  },
  toggleText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.accent,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.expired,
    marginTop: spacing.xs,
  },
});

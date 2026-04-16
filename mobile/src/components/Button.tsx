import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { colors, fonts, radius, spacing } from "@/core/theme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "outline";
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={isPrimary ? colors.white : colors.accent}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            isPrimary ? styles.primaryText : styles.outlineText,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontFamily: fonts.headingBold,
    fontSize: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  primaryText: {
    color: colors.white,
  },
  outlineText: {
    color: colors.accent,
  },
});

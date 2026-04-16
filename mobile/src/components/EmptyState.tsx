import { View, Text, StyleSheet } from "react-native";
import { colors, fonts, spacing } from "@/core/theme";

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.primary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  message: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
});

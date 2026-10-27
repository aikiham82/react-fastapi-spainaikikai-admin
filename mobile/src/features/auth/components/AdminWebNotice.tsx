import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import * as Linking from "expo-linking";

import { useAuth } from "@/features/auth/hooks/useAuth";
import type { UserMe } from "@/features/auth/auth.schema";
import { Button } from "@/components/Button";
import { ADMIN_WEB_URL } from "@/core/web-urls";
import { colors, fonts, spacing, radius } from "@/core/theme";

export function managesAClub(user: UserMe | null): boolean {
  return user?.club_role === "admin" || user?.global_role === "super_admin";
}

export function AdminWebNotice({ style }: { style?: ViewStyle }) {
  const { user } = useAuth();
  if (!managesAClub(user)) return null;

  return (
    <WebNoticeCard
      style={style}
      title="Esta app es solo tu carné de socio"
      body="Para pagar licencias, dar de alta socios y consultar tu club, usa la web Spain Aikikai Admin. Puedes instalarla en el móvil desde la propia web."
    />
  );
}

export function ClubAccountNotice({ style }: { style?: ViewStyle }) {
  return (
    <WebNoticeCard
      style={style}
      title="Esta es la cuenta del club"
      body="La app es el carné de cada socio. Para gestionar el club entra en Spain Aikikai Admin con esta cuenta."
      buttonVariant="outline"
    />
  );
}

function WebNoticeCard({
  style,
  title,
  body,
  buttonVariant = "primary",
}: {
  style?: ViewStyle;
  title: string;
  body: string;
  buttonVariant?: "primary" | "outline";
}) {
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Button
        title="Abrir Spain Aikikai Admin"
        variant={buttonVariant}
        onPress={() => Linking.openURL(ADMIN_WEB_URL)}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
  },
  button: {
    marginTop: spacing.md,
  },
});

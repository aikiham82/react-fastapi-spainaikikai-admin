import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";

import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  useMemberLicenseQuery,
  useLicenseImageQuery,
} from "@/features/license/hooks/queries/useLicenseQuery";
import { formatGrade, isLicenseActive, getExpiryDate } from "@/features/license/license.schema";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { colors, fonts, spacing, radius } from "@/core/theme";

export default function LicenseScreen() {
  const { user, signOut } = useAuth();
  const memberId = user?.member_id;

  const {
    data: license,
    isLoading: licenseLoading,
    refetch: refetchLicense,
    isRefetching,
  } = useMemberLicenseQuery(memberId);

  const {
    data: imageUri,
    isLoading: imageLoading,
    refetch: refetchImage,
  } = useLicenseImageQuery(license?.id);

  const onRefresh = useCallback(() => {
    refetchLicense();
    refetchImage();
  }, [refetchLicense, refetchImage]);

  async function handleDownload() {
    if (!imageUri) return;

    try {
      const filename = `licencia_${license?.id ?? "member"}.png`;
      const file = new File(Paths.cache, filename);

      // Extract base64 data and write to file
      const base64Data = imageUri.replace("data:image/png;base64,", "");
      file.write(base64Data, { encoding: "base64" });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "image/png",
          dialogTitle: "Guardar licencia",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Error", "No se pudo descargar la licencia");
    }
  }

  function handleLogout() {
    Alert.alert("Cerrar sesion", "Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  }

  // No member_id linked
  if (!memberId) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen
          options={{
            title: "Mi Licencia",
            headerRight: () => (
              <Text onPress={handleLogout} style={styles.logoutText}>
                Salir
              </Text>
            ),
          }}
        />
        <EmptyState
          title="Sin miembro asociado"
          message="Tu cuenta no tiene un miembro asociado. Contacta con tu club."
        />
      </SafeAreaView>
    );
  }

  // Loading
  if (licenseLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: "Mi Licencia" }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Cargando licencia...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No license found
  if (!license) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen
          options={{
            title: "Mi Licencia",
            headerRight: () => (
              <Text onPress={handleLogout} style={styles.logoutText}>
                Salir
              </Text>
            ),
          }}
        />
        <EmptyState
          title="Sin licencia vigente"
          message="No tienes licencia vigente. Contacta con tu club."
        />
      </SafeAreaView>
    );
  }

  const active = isLicenseActive(license);
  const rawExpiry = getExpiryDate(license);
  const expiryFormatted = rawExpiry
    ? new Date(rawExpiry).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen
        options={{
          title: "Mi Licencia",
          headerRight: () => (
            <Text onPress={handleLogout} style={styles.logoutText}>
              Salir
            </Text>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* License Image Card */}
        <View style={styles.imageCard}>
          {imageLoading ? (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.licenseImage}
              contentFit="contain"
              transition={200}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>
                No se pudo cargar la imagen
              </Text>
              <Button
                title="Reintentar"
                onPress={() => refetchImage()}
                variant="outline"
                style={styles.retryButton}
              />
            </View>
          )}
        </View>

        {/* Status Badge */}
        <View style={styles.statusRow}>
          <View
            style={[
              styles.badge,
              active ? styles.badgeActive : styles.badgeExpired,
            ]}
          >
            <View
              style={[
                styles.badgeDot,
                { backgroundColor: active ? colors.success : colors.expired },
              ]}
            />
            <Text
              style={[
                styles.badgeText,
                { color: active ? colors.success : colors.expired },
              ]}
            >
              {active ? "VIGENTE" : "EXPIRADA"}
            </Text>
          </View>
          <Text style={styles.expiryText}>Expira: {expiryFormatted}</Text>
        </View>

        {/* License Details */}
        <View style={styles.details}>
          {license.member_name && (
            <DetailRow label="Nombre" value={license.member_name} />
          )}
          <DetailRow label="Grado" value={formatGrade(license)} />
          {license.license_number && (
            <DetailRow label="N. Licencia" value={license.license_number} />
          )}
        </View>

        {/* Download Button */}
        {imageUri && (
          <Button
            title="Descargar"
            onPress={handleDownload}
            variant="outline"
            style={styles.downloadButton}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
  },
  logoutText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.accent,
    paddingHorizontal: spacing.md,
  },
  imageCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    marginBottom: spacing.lg,
  },
  licenseImage: {
    width: "100%",
    aspectRatio: 1.586, // Credit card ratio
  },
  imagePlaceholder: {
    width: "100%",
    aspectRatio: 1.586,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.border,
  },
  imagePlaceholderText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    height: 40,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.xl,
  },
  badgeActive: {
    backgroundColor: colors.successBg,
  },
  badgeExpired: {
    backgroundColor: colors.expiredBg,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontFamily: fonts.headingBold,
    fontSize: 13,
    letterSpacing: 1,
  },
  expiryText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
  },
  details: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
  },
  detailValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.primary,
  },
  downloadButton: {
    marginTop: spacing.sm,
  },
});

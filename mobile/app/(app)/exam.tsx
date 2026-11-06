import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import axios from "axios";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useMemberLicenseQuery } from "@/features/license/hooks/queries/useLicenseQuery";
import {
  EXAM_KEYS,
  EXAM_NOTES,
  examGradeLabel,
  formatEuros,
  isoDateOf,
  nextExamOf,
  type ExamKey,
} from "@/features/exam/exam.schema";
import { getExamPrices, startExamPayment } from "@/features/exam/exam.service";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { colors, fonts, spacing, radius } from "@/core/theme";

const errorMessageOf = (error: unknown): string =>
  (axios.isAxiosError(error) && typeof error.response?.data?.detail === "string" && error.response.data.detail) ||
  "No se ha podido iniciar el pago. Inténtalo de nuevo.";

export default function ExamPaymentScreen() {
  const { user } = useAuth();
  const memberId = user?.member_id ?? "";
  const { data: license } = useMemberLicenseQuery(memberId);
  const prices = useQuery({ queryKey: ["exam-prices"], queryFn: getExamPrices, staleTime: 5 * 60 * 1000 });

  const [exam, setExam] = useState<ExamKey | null>(null);
  const [dateText, setDateText] = useState("");
  const [venue, setVenue] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (license) setExam((current) => current ?? nextExamOf(license.grade));
  }, [license]);

  const priceOf = new Map((prices.data ?? []).map((p) => [p.key, p.price]));
  const price = exam ? priceOf.get(exam) : undefined;

  async function pay() {
    const examDate = isoDateOf(dateText);
    const found: Record<string, string> = {};
    if (!exam) found.exam = "Elige el grado al que te presentas";
    if (!examDate) found.date = "Escribe la fecha como 14/11/2026";
    if (!venue.trim()) found.venue = "Indica el lugar del examen";
    setErrors(found);
    if (!exam || !examDate || !venue.trim()) return;

    setSending(true);
    try {
      const redirectUrl = await startExamPayment({
        member_id: memberId,
        exam,
        exam_date: examDate,
        venue: venue.trim(),
        payer_name: license?.member_name ?? user?.email ?? "Socio",
      });
      await WebBrowser.openBrowserAsync(redirectUrl);
      setSent(true);
    } catch (error) {
      setErrors({ payment: errorMessageOf(error) });
    } finally {
      setSending(false);
    }
  }

  if (sent && exam) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <Stack.Screen options={{ title: "Pagar examen" }} />
        <View style={styles.done}>
          <View style={styles.okCircle}>
            <Text style={styles.okMark}>€</Text>
          </View>
          <Text style={styles.doneTitle}>Has vuelto del banco</Text>
          <Text style={styles.doneText}>
            Si has completado el pago, tu club verá el examen de {examGradeLabel(exam)} como pagado en unos minutos y
            recibirás la factura por correo. Si lo has cancelado, no se ha cobrado nada.
          </Text>
        </View>
        <View style={styles.footer}>
          <Button title="Volver al carnet" onPress={() => router.back()} />
          <Button title="Intentarlo de nuevo" variant="outline" onPress={() => setSent(false)} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Pagar examen" }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Grado al que te presentas</Text>
        {prices.isLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : prices.isError ? (
          <View style={styles.retry}>
            <Text style={styles.error}>No se han podido cargar los precios.</Text>
            <Button title="Reintentar" variant="outline" onPress={() => prices.refetch()} />
          </View>
        ) : (
          <View style={styles.grades} accessibilityRole="radiogroup">
            {EXAM_KEYS.map((key) => {
              const selected = exam === key;
              const keyPrice = priceOf.get(key);
              const note = EXAM_NOTES[key] ?? (key === nextExamOf(license?.grade) ? "siguiente grado" : "");
              return (
                <Pressable
                  key={key}
                  onPress={() => setExam(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  style={[styles.grade, selected && styles.gradeOn]}
                >
                  <View style={styles.gradeText}>
                    <Text style={[styles.gradeName, selected && styles.gradeNameOn]}>{examGradeLabel(key)}</Text>
                    {note ? <Text style={styles.gradeNote}>{note}</Text> : null}
                  </View>
                  <Text style={[styles.gradePrice, selected && styles.gradeNameOn]}>
                    {keyPrice === undefined ? "Sin precio" : formatEuros(keyPrice)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
        {errors.exam && <Text style={styles.error}>{errors.exam}</Text>}

        <Input
          label="Fecha del examen"
          placeholder="DD/MM/AAAA"
          value={dateText}
          onChangeText={setDateText}
          keyboardType="numbers-and-punctuation"
          error={errors.date}
        />
        <Input
          label="Lugar del examen"
          placeholder="Ciudad o dojo"
          value={venue}
          onChangeText={setVenue}
          autoCapitalize="sentences"
          maxLength={200}
          error={errors.venue}
        />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{price === undefined ? "-" : formatEuros(price)}</Text>
        </View>
        {exam && price === undefined && !prices.isLoading && (
          <Text style={styles.error}>Este examen no tiene precio. Avisa a tu club.</Text>
        )}
        {errors.payment && <Text style={styles.error}>{errors.payment}</Text>}
        <Button
          title="Pagar con tarjeta"
          onPress={pay}
          loading={sending}
          disabled={!memberId || (exam !== null && price === undefined)}
        />
        <Text style={styles.note}>Se abrirá el navegador para pagar en el banco. Pagar el examen no cambia tu grado.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.md, gap: spacing.md },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.primary },
  grades: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  grade: {
    width: "48.5%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  gradeOn: { borderColor: colors.accent, backgroundColor: "#F8E7E7" },
  gradeText: { flexShrink: 1 },
  gradeName: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.primary },
  gradeNameOn: { color: colors.accent },
  gradeNote: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  gradePrice: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.primary },
  retry: { gap: spacing.sm },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.expired },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  totalLabel: { fontFamily: fonts.body, fontSize: 16, color: colors.primary },
  totalValue: { fontFamily: fonts.bodySemiBold, fontSize: 20, color: colors.primary },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  done: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, paddingHorizontal: spacing.xl },
  okCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.successBg,
    alignItems: "center",
    justifyContent: "center",
  },
  okMark: { fontSize: 34, color: colors.success, fontFamily: fonts.bodySemiBold },
  doneTitle: { fontFamily: fonts.headingBold, fontSize: 26, color: colors.primary },
  doneText: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted, textAlign: "center", lineHeight: 21 },
});

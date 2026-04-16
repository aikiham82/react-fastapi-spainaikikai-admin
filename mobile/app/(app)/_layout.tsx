import { Stack } from "expo-router";
import { colors, fonts } from "@/core/theme";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: fonts.heading,
          fontSize: 20,
        },
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );
}

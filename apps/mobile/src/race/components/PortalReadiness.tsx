import { Pressable, Text, View } from "react-native";
import { Link } from "expo-router";

import type { ConnectionState } from "../../store/portalStore";
import { colors } from "../../theme/tokens";
import { portalReadiness } from "../presentation";
import { raceStyles as styles } from "./styles";

export function PortalStatusPill({ connection }: { readonly connection: ConnectionState }) {
  const readiness = portalReadiness(connection);
  const dotColor =
    readiness.tone === "ready"
      ? colors.ok
      : readiness.tone === "busy"
        ? colors.warn
        : colors.idle;

  return (
    <View
      style={styles.readinessPill}
      accessible
      accessibilityLabel={`${readiness.label}. ${readiness.detail}`}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.readinessDot, { backgroundColor: dotColor }]} />
      <Text style={styles.readinessLabel}>{readiness.label}</Text>
    </View>
  );
}

export function PortalRecovery({ connection }: { readonly connection: ConnectionState }) {
  if (connection !== "disconnected") return null;
  const readiness = portalReadiness(connection);
  return (
    <View style={styles.readinessCard}>
      <View
        style={styles.readinessText}
        accessible
        accessibilityLabel={`${readiness.label}. ${readiness.detail}`}
      >
        <Text style={styles.readinessTitle}>{readiness.label}</Text>
        <Text style={styles.readinessDetail}>{readiness.detail}</Text>
      </View>
      <Link href="/" asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="Connect portal on Speed tab"
          accessibilityHint="Opens the Speed tab where you can connect a portal or start Demo"
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.recoveryLink}>Connect on Speed</Text>
        </Pressable>
      </Link>
    </View>
  );
}

/**
 * More — the overflow tab (issue #29, advances #30). Holds the secondary
 * destinations that don't earn a permanent spot in the bottom tab bar.
 *
 * Restyled to Trackside Telemetry (proposal B): two grouped cards — "Racing
 * tools" (Achievements, Live portal, TV mode) and "App" (Settings, Credits) —
 * each row a 56pt telemetry row: outline icon · title · optional status value ·
 * chevron aligned to the label line. See docs/design/ui-overhaul/02.
 */
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { summarize } from '@/achievements/engine';
import { LinkPressable } from '@/components/LinkPressable';
import { useAchievementsStore } from '@/store/achievementsStore';
import { colors, fontSize, fontSizeT, fontWeight, radiusT, spacing } from '@/theme/tokens';
import { useLayout } from '@/layout/useLayout';
import { ScreenHeader } from '@/components/redline';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type Href = '/achievements' | '/live' | '/tv' | '/settings' | '/credits';

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const { unlockedCount, total } = summarize(unlocked);

  return (
    <View style={[styles.screen, { paddingTop: spacing(2) }]}>
      <View style={[styles.header, { maxWidth: layout.contentMaxWidth }]}>
        <ScreenHeader title="More" />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + spacing(6), maxWidth: layout.contentMaxWidth },
        ]}
      >
        <Text style={styles.groupLabel}>Racing tools</Text>
        <View style={styles.group}>
          <MoreRow
            href="/achievements"
            icon="trophy-outline"
            title="Achievements"
            value={`${unlockedCount}/${total}`}
            subtitle="Milestones and records"
          />
          <Divider />
          <MoreRow
            href="/live"
            icon="access-point"
            title="Live portal"
            subtitle="Raw decoded BLE event log"
          />
          <Divider />
          <MoreRow
            href="/tv"
            icon="television-play"
            title="TV mode"
            subtitle="Full-screen dashboard for AirPlay mirroring"
          />
        </View>

        <Text style={styles.groupLabel}>App</Text>
        <View style={styles.group}>
          <MoreRow
            href="/settings"
            icon="cog-outline"
            title="Settings"
            subtitle="Units · haptics · player profile"
          />
          <Divider />
          <MoreRow
            href="/credits"
            icon="information-outline"
            title="Credits & licenses"
            subtitle="Catalog provenance · privacy · open source"
          />
        </View>
      </ScrollView>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function MoreRow({
  href,
  icon,
  title,
  subtitle,
  value,
}: {
  href: Href;
  icon: IconName;
  title: string;
  subtitle: string;
  value?: string;
}) {
  return (
    <Link href={href} asChild>
      <LinkPressable
        accessibilityRole="button"
        accessibilityLabel={value ? `${title}, ${value}` : title}
        contentStyle={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name={icon} size={21} color={colors.electric} />
        <View style={styles.rowMain}>
          <View style={styles.rowLine}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {title}
            </Text>
            {value ? <Text style={styles.rowValue}>{value}</Text> : null}
            <Text style={styles.chevron}>›</Text>
          </View>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </LinkPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.void },
  header: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    width: '100%',
    alignSelf: 'center',
  },
  title: { color: colors.ink, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
  list: { paddingHorizontal: spacing(5), width: '100%', alignSelf: 'center' },
  groupLabel: {
    color: colors.inkMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing(5),
    marginBottom: spacing(2),
    marginLeft: spacing(3),
  },
  group: {
    backgroundColor: colors.panelSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    borderRadius: radiusT.group,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.hairline,
    marginLeft: spacing(4) + 21 + spacing(4), // label column inset (icon + gap)
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    paddingVertical: spacing(3.5),
    paddingHorizontal: spacing(4),
    minHeight: 56,
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  rowTitle: { flex: 1, color: colors.ink, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  rowValue: {
    color: colors.inkSecondary,
    fontSize: fontSizeT.sm,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  rowSubtitle: { color: colors.inkSecondary, fontSize: fontSize.sm, marginTop: 2 },
  chevron: { color: colors.inkMuted, fontSize: fontSize.xl, fontWeight: fontWeight.medium },
  pressed: { opacity: 0.7 },
});

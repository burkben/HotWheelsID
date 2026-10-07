/**
 * More — the overflow tab (issue #29, advances #30). Holds the secondary
 * destinations that don't earn a permanent spot in the bottom tab bar.
 *
 * Redline (SPEC §4.10, no mockup): two square `pitLane` groups — "Racing tools"
 * (Trophy case, Live portal, TV mode) and "App" (Settings, Credits) — each row a
 * flame icon · title · subtitle · optional trophy progress · chevron.
 */
import type { ComponentProps } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { summarize } from '@/achievements/engine';
import { LinkPressable } from '@/components/LinkPressable';
import { useAchievementsStore } from '@/store/achievementsStore';
import { trophyCountLabel } from '@/achievements/trophyPresentation';
import { colorsR, fontR } from '@/theme/tokens';
import { useLayout } from '@/layout/useLayout';
import { Kerb, RText, ScreenHeader, SectionHeader } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type Href = '/achievements' | '/live' | '/tv' | '/settings' | '/credits';

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const { unlockedCount, total } = summarize(unlocked);
  const gutter = layout.isTablet ? layout.gutter : 16;

  return (
    <View style={[styles.screen, { paddingTop: 8 }]}>
      <View style={[styles.header, { maxWidth: layout.contentMaxWidth, paddingHorizontal: gutter }]}>
        <ScreenHeader title="More" />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 24, maxWidth: layout.contentMaxWidth, paddingHorizontal: gutter },
        ]}
      >
        <SectionHeader title="Racing tools" />
        <View style={styles.group}>
          <MoreRow
            href="/achievements"
            icon="trophy-outline"
            title="Trophy case"
            subtitle="Achievements, milestones and records"
            progress={{ unlocked: unlockedCount, total }}
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

        <SectionHeader title="App" />
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
  return <View {...decorative} style={styles.divider} />;
}

function MoreRow({
  href,
  icon,
  title,
  subtitle,
  progress,
}: {
  href: Href;
  icon: IconName;
  title: string;
  subtitle: string;
  progress?: { unlocked: number; total: number };
}) {
  return (
    <Link href={href} asChild>
      <LinkPressable
        accessibilityRole="button"
        accessibilityLabel={progress ? `${title}, ${trophyCountLabel(progress.unlocked, progress.total)}` : title}
        accessibilityHint={subtitle}
        contentStyle={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name={icon} size={22} color={colorsR.flame} />
        <View style={styles.rowMain}>
          <RText style={styles.rowTitle} numberOfLines={1}>{title}</RText>
          <RText variant="bodySmall" style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</RText>
          {progress && progress.total > 0 && (
            <View {...decorative} style={styles.progressTrack}>
              <View style={{ width: `${(progress.unlocked / progress.total) * 100}%` }}>
                <Kerb height={4} stripe={6} colors={[colorsR.caution, colorsR.chalk]} />
              </View>
            </View>
          )}
        </View>
        {progress && (
          <RText variant="statValue" style={styles.rowValue}>
            <RText variant="statValue" style={[styles.rowValue, { color: colorsR.caution }]}>{progress.unlocked}</RText>/{progress.total}
          </RText>
        )}
        <MaterialCommunityIcons name="chevron-right" size={22} color={colorsR.inkMuted} />
      </LinkPressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  header: { paddingBottom: 18, width: '100%', alignSelf: 'center' },
  list: { width: '100%', alignSelf: 'center', gap: 12 },
  group: { backgroundColor: colorsR.pitLane, marginBottom: 10 },
  divider: { height: 1, backgroundColor: colorsR.divider, marginLeft: 16 + 22 + 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 16, minHeight: 64 },
  rowMain: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontFamily: fontR.bodySemi, color: colorsR.chalk },
  rowSubtitle: { color: colorsR.inkSecondary, fontSize: 13, lineHeight: 17 },
  progressTrack: { height: 4, marginTop: 6, backgroundColor: colorsR.trackGrey, overflow: 'hidden', maxWidth: 160 },
  rowValue: { fontSize: 16, lineHeight: 20, color: colorsR.inkMuted },
  pressed: { opacity: 0.7 },
});

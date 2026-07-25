/**
 * More — the overflow tab (issue #29, advances #30). Holds the secondary
 * destinations that don't earn a permanent spot in the bottom tab bar:
 * Achievements, the Live portal event log, and Settings. Each row pushes its
 * screen over the tabs from the root stack (see {@link RootLayout}).
 *
 * Rows follow the design-language "mode list" pattern: vector icon · title ·
 * stat subtitle · chevron, on `surface` cards. See docs/architecture/design-language.md §5.
 */
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { summarize } from '@/achievements/engine';
import { useAchievementsStore } from '@/store/achievementsStore';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const { unlockedCount, total } = summarize(unlocked);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing(2) }]}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing(6) }]}
      >
        <MoreRow
          href="/achievements"
          icon="trophy"
          title="Achievements"
          subtitle={`${unlockedCount}/${total} unlocked`}
        />
        <MoreRow
          href="/live"
          icon="access-point"
          title="Live portal"
          subtitle="Raw decoded BLE event log"
        />
        <MoreRow
          href="/settings"
          icon="cog"
          title="Settings"
          subtitle="Units · haptics · player profile"
        />
        <MoreRow
          href="/credits"
          icon="information-outline"
          title="Credits & licenses"
          subtitle="Catalog provenance · privacy · open source"
        />
      </ScrollView>
    </View>
  );
}

function MoreRow({
  href,
  icon,
  title,
  subtitle,
}: {
  href: '/achievements' | '/live' | '/settings' | '/credits';
  icon: IconName;
  title: string;
  subtitle: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <MaterialCommunityIcons name={icon} size={26} color={colors.accent} />
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
  list: { paddingHorizontal: spacing(5), gap: spacing(3) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
  },
  rowMain: { flex: 1, gap: 2 },
  rowTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  rowSubtitle: { color: colors.textSecondary, fontSize: fontSize.sm },
  chevron: { color: colors.textMuted, fontSize: fontSize.xl, fontWeight: fontWeight.medium },
  pressed: { opacity: 0.7 },
});

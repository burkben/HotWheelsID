/**
 * Achievements — a grid of unlockable badges across Racing / Speed / Collection
 * (Phase 5). Reads the live {@link useAchievementsStore} (kept current by the
 * persistence bootstrap from durable race totals + the garage) and renders each
 * catalog entry via the pure {@link evaluate} engine: unlocked badges show their
 * date, locked ones a progress bar toward the goal.
 *
 * When SQLite isn't in the build yet the store stays empty, so everything reads
 * as locked at 0% — the same graceful no-rebuild fallback as Garage/History.
 */
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type AchievementCategory,
} from '@/achievements/catalog';
import { evaluate, summarize, type AchievementView } from '@/achievements/engine';
import { goalProgressLabel, formatUnlockedDate, progressPercent } from '@/achievements/format';
import { useAchievementsStore } from '@/store/achievementsStore';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const stats = useAchievementsStore((s) => s.stats);

  const views = useMemo(() => evaluate(stats, unlocked), [stats, unlocked]);
  const { unlockedCount, total } = summarize(unlocked);

  const byCategory = useMemo(() => {
    const groups: Record<AchievementCategory, AchievementView[]> = {
      racing: [],
      speed: [],
      collection: [],
    };
    for (const v of views) groups[v.category].push(v);
    return groups;
  }, [views]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing(2) }]}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ Home</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>Achievements</Text>
        <View style={styles.countChip}>
          <Text style={styles.countText}>
            {unlockedCount}/{total}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing(6) }]}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORY_ORDER.map((cat) => (
          <View key={cat} style={styles.section}>
            <Text style={styles.sectionTitle}>{CATEGORY_LABELS[cat]}</Text>
            {byCategory[cat].map((v) => (
              <AchievementRow key={v.id} view={v} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function AchievementRow({ view }: { view: AchievementView }) {
  const pct = progressPercent(view.progress);
  return (
    <View style={[styles.row, view.unlocked ? styles.rowUnlocked : styles.rowLocked]}>
      <Text style={[styles.icon, !view.unlocked && styles.iconLocked]}>{view.icon}</Text>
      <View style={styles.rowMain}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, !view.unlocked && styles.rowTitleLocked]} numberOfLines={1}>
            {view.title}
          </Text>
          {view.unlocked && <Text style={styles.check}>✓</Text>}
        </View>
        <Text style={styles.rowDesc} numberOfLines={2}>
          {view.description}
        </Text>
        {view.unlocked ? (
          <Text style={styles.unlockedAt}>{formatUnlockedDate(view.unlockedAt)}</Text>
        ) : (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{goalProgressLabel(view)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  back: { paddingVertical: spacing(1), paddingRight: spacing(1) },
  backText: { color: colors.accentBlue, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.heavy, flex: 1 },
  countChip: {
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(3),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  countText: { color: colors.accent, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  list: { paddingHorizontal: spacing(5), gap: spacing(5) },
  section: { gap: spacing(3) },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    gap: spacing(3),
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
  },
  rowUnlocked: { backgroundColor: colors.surface, borderColor: colors.accent },
  rowLocked: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
  icon: { fontSize: 30 },
  iconLocked: { opacity: 0.4 },
  rowMain: { flex: 1, gap: 4 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  rowTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold, flexShrink: 1 },
  rowTitleLocked: { color: colors.textSecondary },
  check: { color: colors.accent, fontSize: fontSize.md, fontWeight: fontWeight.heavy },
  rowDesc: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 18 },
  unlockedAt: {
    marginTop: 2,
    color: colors.accent,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressWrap: { marginTop: spacing(1), gap: 4 },
  progressTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.track,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.accentBlue },
  progressLabel: { color: colors.textMuted, fontSize: fontSize.xs },
  pressed: { opacity: 0.7 },
});

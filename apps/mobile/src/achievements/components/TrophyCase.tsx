import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { AchievementView } from '../engine';
import { formatUnlockedDate } from '../format';
import { trophyIcon } from '../icons';
import { latestUnlock, medallionProgress, trophyCountLabel, trophyGroups } from '../trophyPresentation';
import { Kerb, Medallion, RText, SectionHeader } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { colorsR, fontR } from '@/theme/tokens';

/** Store-free layout, shared with the development fixture. */
export function TrophyCase({ views, summary, maxWidth, top, bottom, onBack }: {
  views: readonly AchievementView[];
  summary: { unlockedCount: number; total: number };
  maxWidth: number;
  top: number;
  bottom: number;
  onBack: () => void;
}) {
  const { unlockedCount, total } = summary;
  const latest = latestUnlock(views);
  const fraction = total > 0 ? unlockedCount / total : 0;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { maxWidth, paddingTop: top + 4, paddingBottom: bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to More" style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Svg {...decorative} width={18} height={18} viewBox="0 0 24 24">
            <Path d="M15 5l-7 7 7 7" stroke={colorsR.electric} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <RText style={styles.backText}>More</RText>
        </Pressable>
        <View style={styles.titleRow}>
          <RText variant="screenTitle" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={styles.title}>Trophy case</RText>
          <RText variant="statValue" accessibilityLabel={trophyCountLabel(unlockedCount, total)} style={styles.count}>
            <RText variant="statValue" style={[styles.count, { color: colorsR.caution }]}>{unlockedCount}</RText>/{total}
          </RText>
        </View>
        <View style={styles.progress} accessible accessibilityRole="progressbar" accessibilityLabel={trophyCountLabel(unlockedCount, total)} accessibilityValue={{ min: 0, max: total, now: unlockedCount }}>
          {fraction > 0 && <View style={{ width: `${fraction * 100}%` }}><Kerb height={8} stripe={8} colors={[colorsR.caution, colorsR.chalk]} /></View>}
        </View>
      </View>

      {latest && (
        <View style={styles.latest} accessible accessibilityLabel={`Latest unlock: ${latest.title}. ${latest.description}`}>
          <View {...decorative} style={styles.latestFlames}>
            <Svg width={120} height={70} viewBox="0 0 120 96">
              <Path d="M44 96 C50 66 40 46 60 12 C64 42 82 54 80 84 C88 72 90 60 86 46 C104 66 102 84 96 96 Z" fill={colorsR.flame} fillOpacity={0.35} />
              <Path d="M6 96 C10 70 0 56 16 32 C20 54 32 62 30 82 C38 70 40 58 38 44 C54 62 54 82 48 96 Z" fill={colorsR.flame} fillOpacity={0.25} />
            </Svg>
          </View>
          <Medallion unlocked featured icon={trophyIcon(latest.id)} size={58} />
          <View style={styles.latestText}>
            <RText variant="chip" style={styles.latestEyebrow}>LATEST UNLOCK</RText>
            <RText variant="wordmark" numberOfLines={1} adjustsFontSizeToFit style={styles.latestTitle}>{latest.title}</RText>
            <RText variant="bodySmall" numberOfLines={2} style={styles.latestDesc}>{latest.description}</RText>
          </View>
        </View>
      )}

      {trophyGroups(views).map((group) => (
        <View key={group.category} style={styles.group}>
          <SectionHeader title={group.title} count={`${group.unlocked}/${group.items.length}`} />
          <View style={styles.grid}>
            {group.items.map((v) => <Tile key={v.id} view={v} />)}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function Tile({ view }: { view: AchievementView }) {
  const progress = medallionProgress(view);
  const label = view.unlocked
    ? `${view.title}, ${formatUnlockedDate(view.unlockedAt).toLowerCase()}. ${view.description}`
    : `${view.title}, locked${progress ? `, ${progress.toLowerCase()}` : ''}. ${view.description}`;
  return (
    <View style={styles.tile} accessible accessibilityLabel={label}>
      <Medallion unlocked={view.unlocked} icon={trophyIcon(view.id)} size={50} />
      <RText variant="bodySmall" style={[styles.tileTitle, !view.unlocked && { color: colorsR.inkSecondary }]}>{view.title}</RText>
      {progress && <RText variant="eyebrow" style={styles.tileProgress}>{progress}</RText>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  content: { paddingHorizontal: 16, gap: 14, width: '100%', alignSelf: 'center' },
  header: { gap: 8 },
  back: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginLeft: -2, marginBottom: -6 },
  backText: { fontFamily: fontR.bodySemi, fontSize: 16, color: colorsR.electric },
  pressed: { opacity: 0.7 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  title: { flexShrink: 1, fontSize: 46, lineHeight: 40 },
  count: { fontSize: 22, lineHeight: 24, color: colorsR.inkMuted },
  progress: { height: 8, backgroundColor: colorsR.trackGrey, overflow: 'hidden' },
  latest: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colorsR.pitLane, overflow: 'hidden', marginTop: 6 },
  latestFlames: { position: 'absolute', right: -8, bottom: -6, opacity: 0.9 },
  latestText: { flex: 1, gap: 2 },
  latestEyebrow: { fontSize: 11, lineHeight: 13, color: colorsR.flame },
  latestTitle: { fontSize: 26, lineHeight: 26, letterSpacing: 0 },
  latestDesc: { fontSize: 13, lineHeight: 17, color: colorsR.inkSecondary },
  group: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 10 },
  tile: { width: '22.5%', flexGrow: 1, maxWidth: '25%', alignItems: 'center', gap: 5 },
  tileTitle: { fontFamily: fontR.bodySemi, fontSize: 12, lineHeight: 14, textAlign: 'center', color: colorsR.chalk },
  tileProgress: { fontFamily: fontR.hud, fontSize: 10, lineHeight: 12, letterSpacing: 0, color: colorsR.inkSecondary },
});

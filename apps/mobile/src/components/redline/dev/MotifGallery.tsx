import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colorsR, fontR } from '@/theme/tokens';
import {
  CarSilhouette, Checker, Chevrons, FlameTongues, Kerb, Medallion,
  RacePlate, RakeLines, Roundel, RText, SkewBox, SpeedStreaks, StartLights,
  TrackLane, Wordmark,
} from '../index';

export function MotifGallery() {
  const insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 800;
  const cells: { title: string; content: ReactNode }[] = [
    { title: 'Kerb', content: <View style={{ width: '100%', gap: 12 }}><Kerb height={20} stripe={16} /><Kerb height={5} /></View> },
    { title: 'Checker', content: <Checker size={8} rows={6} cols={12} skew={-14} style={{ borderWidth: 1, borderColor: colorsR.chalk }} /> },
    { title: 'Track lane', content: <TrackLane height={64} /> },
    { title: 'Race plate', content: <View style={styles.row}><RacePlate number="07" size="large" outlined /><Roundel number={24} size={48} fill={colorsR.flame} /></View> },
    { title: 'Start lights', content: <StartLights count={5} lit={3} size={16} /> },
    { title: 'Speed streaks', content: <View><SpeedStreaks scale={0.65} /><View style={{ position: 'absolute', right: -12, top: 0 }}><CarSilhouette color={colorsR.chalk} width={70} /></View></View> },
    { title: 'Chevrons', content: <Chevrons height={46} /> },
    { title: 'Flames', content: <View style={{ flexDirection: 'row' }}><FlameTongues width={80} /><FlameTongues width={80} side="right" /></View> },
  ];
  return (
    <ScrollView testID="motif-gallery" style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
      <Wordmark />
      <RText variant="screenTitle" style={{ fontSize: 42, lineHeight: 42 }}>TRACKSIDE KIT</RText>
      <RText variant="bodySmall" style={{ color: colorsR.inkSecondary }}>Development gallery · SPEC §2</RText>
      <View style={styles.grid} testID="motif-grid">
        {cells.map(({ title, content }) => (
          <View key={title} style={[styles.tile, { width: wide ? '23.5%' : '48%' }]} testID={`motif-${title}`}>
            <View style={styles.art}>{content}</View>
            <RText variant="bodySmall" style={styles.caption}>{title}</RText>
          </View>
        ))}
      </View>
      <RText variant="sectionTitle">ADDITIONAL PRIMITIVES & STATES</RText>
      <View style={styles.panel} testID="motif-cars">
        <RakeLines opacity={0.12} style={StyleSheet.absoluteFill} />
        <View style={{ gap: 16 }}>
          <RText variant="eyebrow">Rake lines · Car silhouette</RText>
          <CarSilhouette width={240} />
          <CarSilhouette width={240} color={colorsR.inkDisabled} outline />
        </View>
      </View>
      <View style={styles.panel} testID="motif-medallions">
        <RText variant="eyebrow">Medallion · locked / unlocked / featured</RText>
        <View style={styles.row}><Medallion unlocked={false} icon="star-four-points" /><Medallion unlocked icon="trophy" /><Medallion unlocked featured icon="fire" /></View>
      </View>
      <View style={styles.panel} testID="motif-marks">
        <RText variant="eyebrow">Wordmark · SkewBox · counter-skewed text</RText>
        <Wordmark />
        <View style={{ backgroundColor: colorsR.flame, padding: 12, alignSelf: 'flex-start' }}><Wordmark inverted /></View>
        <SkewBox style={{ backgroundColor: colorsR.gridBox, padding: 12, alignSelf: 'flex-start' }}><RText variant="lapTime">00:02.847</RText></SkewBox>
        <View style={styles.row}><RacePlate size="small" number="?" /><RacePlate number="07" /><RacePlate size="hero" number={100} /></View>
      </View>
      <View style={[styles.panel, { backgroundColor: colorsR.asphalt }]} testID="motif-gantry">
        <RText variant="eyebrow">Gantry · two pods lit</RText>
        <StartLights variant="gantry" lit={2} />
      </View>
      <View style={styles.panel} testID="motif-go">
        <RText variant="eyebrow">Start lights · off / go</RText>
        <StartLights lit={0} />
        <StartLights go />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.pitWall },
  content: { width: '100%', maxWidth: 1440, alignSelf: 'center', paddingHorizontal: 16, gap: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { backgroundColor: colorsR.pitLane },
  art: { height: 104, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  caption: { borderTopWidth: 1, borderTopColor: colorsR.hairline, padding: 10, fontFamily: fontR.bodyBold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  panel: { padding: 14, gap: 16, backgroundColor: colorsR.pitLane },
});

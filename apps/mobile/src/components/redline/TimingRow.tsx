import { StyleSheet, View } from 'react-native';
import { colorsR } from '@/theme/tokens';
import { RText } from './RText';
import { spokenLapDelta, spokenUnit, timingPresentation } from './readoutPresentation';

export function TimingRow({ lap, seconds, deltaSeconds, gateSpeed, speedUnit = 'MPH', state = 'normal', timeFormat = 'clock' }: {
  lap: number;
  timeFormat?: 'clock' | 'seconds';
  seconds?: number;
  deltaSeconds?: number;
  gateSpeed?: string;
  speedUnit?: string;
  state?: 'normal' | 'fastest' | 'running';
}) {
  const fastest = state === 'fastest';
  const running = state === 'running';
  const { time, delta, slower, spoken } = timingPresentation(seconds, deltaSeconds, timeFormat);
  const label = [`Lap ${lap}`, running ? 'running' : spoken, fastest && 'fastest', !running && !fastest && delta && spokenLapDelta(deltaSeconds!), gateSpeed && (gateSpeed === '—' ? 'Gate speed unavailable' : `${gateSpeed} ${spokenUnit(speedUnit)}`)].filter(Boolean).join(', ');
  return (
    <View accessible accessibilityLabel={label} style={[styles.row, fastest && { borderWidth: 1, borderColor: colorsR.electric }, running && { opacity: 0.75 }]}>
      <View style={[styles.lap, { backgroundColor: fastest ? colorsR.electric : colorsR.gridBox }]}><RText variant="wordmark" style={{ fontSize: 22, lineHeight: 26, color: fastest ? colorsR.asphalt : running ? colorsR.flame : colorsR.chalk }}>L{lap}</RText></View>
      <RText variant="lapTime" style={{ flex: 1, textTransform: 'none', color: fastest ? colorsR.electric : colorsR.chalk }} adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1}>{running ? 'running…' : time}</RText>
      {fastest ? <RText variant="chip" style={{ color: colorsR.electric, letterSpacing: 1 }}>FASTEST</RText> : !running && delta ? <RText variant="lapTime" style={{ fontSize: 14, color: slower ? colorsR.deltaSlower : colorsR.greenFlag }}>{delta}</RText> : null}
      {gateSpeed && <RText variant="lapTime" style={{ fontSize: 14 }}>{gateSpeed}</RText>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', backgroundColor: colorsR.pitLane, gap: 10, paddingRight: 12 },
  lap: { width: 42, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
});

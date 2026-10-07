import { StyleSheet, View } from 'react-native';

import { CarSilhouette, RText, TrackLane } from '@/components/redline';
import { decorative } from '@/components/redline/decorative';
import { colorsR } from '@/theme/tokens';

/** Empty garage (SPEC §4.7): a motif illustration instead of an emoji. */
export function GarageEmpty() {
  return (
    <View style={styles.empty}>
      <View {...decorative} style={styles.art}>
        <TrackLane height={64} />
        <View style={styles.car}>
          <CarSilhouette width={180} color={colorsR.inkDisabled} outline />
        </View>
      </View>
      <RText variant="sectionTitle" accessibilityRole="header" style={styles.title}>No cars yet</RText>
      <RText style={styles.body}>Your collection lives here. Send a car through the portal.</RText>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: 10, paddingHorizontal: 8 },
  // The car's wheels rest on the lane's top edge.
  art: { width: '100%', maxWidth: 320, height: 118, justifyContent: 'flex-end', marginBottom: 8 },
  car: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center' },
  title: { fontSize: 22, lineHeight: 26 },
  body: { color: colorsR.inkSecondary, textAlign: 'center', maxWidth: 300 },
});

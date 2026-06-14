import { StyleSheet, Text, View } from 'react-native';

import {
  PORTAL_NAME,
  SERVICE_CONTROL,
  parseSpeed,
} from '@hotwheelsid/protocol';

// Phase 0 smoke check: importing and exercising the shared protocol package
// proves the npm-workspace link and Metro transpilation of @hotwheelsid/protocol
// both work. Real BLE/UI features arrive in later phases.
const SAMPLE_SPEED = parseSpeed(new Uint8Array([0xb0, 0x1c, 0x14, 0x3e]));

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>HotWheelsID</Text>
      <Text style={styles.subtitle}>Phase 0 — monorepo scaffold</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>@hotwheelsid/protocol</Text>
        <Text style={styles.mono}>Portal name: {PORTAL_NAME}</Text>
        <Text style={styles.mono}>Control service: {SERVICE_CONTROL}</Text>
        <Text style={styles.mono}>
          Sample speed: {SAMPLE_SPEED.scaleMph.toFixed(2)} scale mph
        </Text>
      </View>

      <Text style={styles.note}>
        BLE and UI features arrive in later phases. This screen only proves the
        shared protocol package is linked into the app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b0f1a',
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: '#8aa0c6',
    fontSize: 16,
  },
  card: {
    marginTop: 12,
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e2a44',
    backgroundColor: '#111827',
    padding: 16,
    gap: 6,
  },
  cardHeading: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  mono: {
    color: '#c7d2fe',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  note: {
    color: '#6b7a99',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 420,
  },
});

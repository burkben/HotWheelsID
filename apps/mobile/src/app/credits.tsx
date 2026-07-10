import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { CATALOG, CATALOG_PROVENANCE } from '@/catalog/catalog';
import { colors, fontSize, fontWeight, radius, spacing } from '@/theme/tokens';

const PRIVACY_URL =
  'https://github.com/burkben/HotWheelsID/blob/main/docs/legal/privacy-policy.md';
const NOTICES_URL =
  'https://github.com/burkben/HotWheelsID/blob/main/THIRD_PARTY_NOTICES.md';

export default function CreditsScreen() {
  const insets = useSafeAreaInsets();
  const { source, licensing, artwork } = CATALOG_PROVENANCE;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing(2) }]}>
      <View style={styles.header}>
        <Link href="/" asChild>
          <Pressable hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ Home</Text>
          </Pressable>
        </Link>
        <Text style={styles.title}>Credits & licenses</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing(8) }]}
      >
        <Text style={styles.sectionLabel}>Car catalog</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{source.name}</Text>
          <Text style={styles.body}>
            {CATALOG.length} catalog records are derived from a pinned community-wiki revision.
            Contributors are credited through the page history and source links.
          </Text>
          <Text style={styles.meta}>
            Revision {source.revisionId} · {source.revisionTimestamp}
          </Text>
          <ExternalLink label="Open pinned source" url={source.revisionUrl} />
          <ExternalLink label="View contributor history" url={source.contributorsUrl} />
        </View>

        <Text style={styles.sectionLabel}>Artwork policy</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Local placeholders only</Text>
          <Text style={styles.body}>{artwork.policy}</Text>
          <Text style={styles.body}>
            Source links open in a browser only when you choose them. Normal app operation does not
            download catalog content.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Source licensing</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            {
              "Fandom's general licensing page and the Hot Wheels Wiki copyright page describe the applicable source terms differently. Redline ID preserves both references rather than claiming a single license."
            }
          </Text>
          {licensing.map((license) => (
            <ExternalLink key={license.url} label={license.name} url={license.url} />
          ))}
          <ExternalLink label="Full third-party notices" url={NOTICES_URL} />
        </View>

        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            Redline ID has no account, analytics, ads, crash reporting, or application server. Race
            and garage data stay on this device.
          </Text>
          <ExternalLink label="Read the privacy policy" url={PRIVACY_URL} />
        </View>

        <Text style={styles.disclaimer}>
          Redline ID is independent and community built. It is not affiliated with, endorsed by, or
          sponsored by Mattel, Inc. or Fandom, Inc.
        </Text>
      </ScrollView>
    </View>
  );
}

function ExternalLink({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      onPress={() => {
        void WebBrowser.openBrowserAsync(url);
      }}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.linkText}>{label} ↗</Text>
    </Pressable>
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
  content: { paddingHorizontal: spacing(5), gap: spacing(2), paddingTop: spacing(1) },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing(4),
    marginBottom: spacing(1),
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(4),
    gap: spacing(2),
  },
  cardTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  body: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  meta: { color: colors.textMuted, fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  link: {
    alignSelf: 'flex-start',
    paddingVertical: spacing(1),
    paddingRight: spacing(2),
  },
  linkText: { color: colors.accentBlue, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  disclaimer: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: spacing(4),
  },
  pressed: { opacity: 0.7 },
});

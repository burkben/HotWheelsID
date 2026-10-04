import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { CATALOG, CATALOG_PROVENANCE } from '@/catalog/catalog';
import { ARTWORK, ARTWORK_COUNT, ARTWORK_UPLOADERS } from '@/catalog/artwork';
import { useLayout } from '@/layout/useLayout';
import { colors, fontSize, fontWeight, radiusT, spacing } from '@/theme/tokens';

import fontLicenses from '@/theme/fontLicenses.json';

const PRIVACY_URL =
  'https://github.com/burkben/HotWheelsID/blob/main/docs/legal/privacy-policy.md';
const NOTICES_URL =
  'https://github.com/burkben/HotWheelsID/blob/main/THIRD_PARTY_NOTICES.md';

export default function CreditsScreen() {
  const insets = useSafeAreaInsets();
  const [showFontLicense, setShowFontLicense] = useState(false);
  const layout = useLayout();
  const { source, licensing } = CATALOG_PROVENANCE;
  const column = { maxWidth: layout.contentMaxWidth };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing(2) }]}>
      <View style={[styles.header, column]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Credits & licenses</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          column,
          { paddingBottom: insets.bottom + spacing(8) },
        ]}
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

        <Text style={styles.sectionLabel}>Catalog artwork</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {ARTWORK_COUNT} photos under {ARTWORK.license.abbreviation}
          </Text>
          <Text style={styles.body}>
            Car photos are bundled with the app and are never downloaded. They come from the
            Hot Wheels Wiki and are reused under the {ARTWORK.license.name} license.
          </Text>
          <Text style={styles.body}>{ARTWORK.license.modifications}</Text>
          <Text style={styles.body}>
            Photographs by {ARTWORK_UPLOADERS.join(', ')}.
          </Text>
          <Text style={styles.meta}>
            {CATALOG.length - ARTWORK_COUNT} catalog entries have no wiki photo and show a
            placeholder instead.
          </Text>
          <ExternalLink label={`${ARTWORK.license.abbreviation} license terms`} url={ARTWORK.license.url} />
          <ExternalLink label="Photo source page" url={ARTWORK.source.revisionUrl} />
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

        <Text style={styles.sectionLabel}>Bundled fonts</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Barlow & Barlow Condensed</Text>
          <Text style={styles.body}>Copyright 2017 The Barlow Project Authors.</Text>
          <Text style={styles.cardTitle}>Chakra Petch</Text>
          <Text style={styles.body}>Copyright 2018 The Chakra Petch Project Authors.</Text>
          <Text style={styles.body}>
            Licensed under the SIL Open Font License 1.1. Fonts are bundled unmodified
            and work offline.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showFontLicense }}
            onPress={() => setShowFontLicense((shown) => !shown)}
            style={({ pressed }) => [styles.fontLicenseButton, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>{showFontLicense ? 'Hide' : 'Read'} font licenses</Text>
          </Pressable>
          {showFontLicense && (
            <Text selectable style={styles.body}>
              {fontLicenses.barlow}{'\n'}{fontLicenses.chakraPetch}
            </Text>
          )}
        </View>

        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            Redline ID has no account, analytics, ads, crash reporting, or application server. It
            does not automatically transmit race or garage data.
          </Text>
          <Text style={styles.body}>
            Share actions open the OS share sheet. Nothing is sent until you choose a destination;
            that destination&apos;s privacy terms apply.
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
  screen: { flex: 1, backgroundColor: colors.void },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    width: '100%',
    alignSelf: 'center',
  },
  back: { paddingVertical: spacing(1), paddingRight: spacing(1) },
  backText: { color: colors.electric, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  title: { color: colors.ink, fontSize: fontSize.xl, fontWeight: fontWeight.heavy, flex: 1 },
  content: {
    paddingHorizontal: spacing(5),
    gap: spacing(2),
    paddingTop: spacing(1),
    width: '100%',
    alignSelf: 'center',
  },
  sectionLabel: {
    color: colors.inkMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing(4),
    marginBottom: spacing(1),
  },
  card: {
    backgroundColor: colors.panelSolid,
    borderColor: colors.hairline,
    borderWidth: 1,
    borderRadius: radiusT.card,
    padding: spacing(4),
    gap: spacing(2),
  },
  cardTitle: { color: colors.ink, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  body: { color: colors.inkSecondary, fontSize: fontSize.sm, lineHeight: 20 },
  meta: { color: colors.inkMuted, fontSize: fontSize.xs, fontVariant: ['tabular-nums'] },
  link: {
    alignSelf: 'flex-start',
    paddingVertical: spacing(1),
    paddingRight: spacing(2),
  },
  fontLicenseButton: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.electric, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  disclaimer: {
    color: colors.inkMuted,
    fontSize: fontSize.xs,
    lineHeight: 18,
    marginTop: spacing(4),
  },
  pressed: { opacity: 0.7 },
});

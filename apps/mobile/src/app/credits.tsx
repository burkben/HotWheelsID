import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { CATALOG, CATALOG_PROVENANCE } from '@/catalog/catalog';
import { ARTWORK, ARTWORK_COUNT, ARTWORK_UPLOADERS } from '@/catalog/artwork';
import { useLayout } from '@/layout/useLayout';
import { RText, ScreenHeader, SectionHeader } from '@/components/redline';
import { colorsR, fontR } from '@/theme/tokens';

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
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>
      <View style={[styles.header, column]}>
        <ScreenHeader
          title="Credits"
          backLabel="Back"
          onBack={() => (router.canGoBack() ? router.back() : router.navigate('/more'))}
        />
        <RText variant="bodySmall" style={styles.subtitle}>Credits & licenses</RText>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          column,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.section}><SectionHeader title="Car catalog" /></View>
        <View style={styles.card}>
          <RText style={styles.cardTitle}>{source.name}</RText>
          <RText variant="bodySmall" style={styles.body}>
            {CATALOG.length} catalog records are derived from a pinned community-wiki revision.
            Contributors are credited through the page history and source links.
          </RText>
          <RText variant="eyebrow" style={styles.meta}>
            Revision {source.revisionId} · {source.revisionTimestamp}
          </RText>
          <ExternalLink label="Open pinned source" url={source.revisionUrl} />
          <ExternalLink label="View contributor history" url={source.contributorsUrl} />
        </View>

        <View style={styles.section}><SectionHeader title="Catalog artwork" /></View>
        <View style={styles.card}>
          <RText style={styles.cardTitle}>
            {ARTWORK_COUNT} photos under {ARTWORK.license.abbreviation}
          </RText>
          <RText variant="bodySmall" style={styles.body}>
            Car photos are bundled with the app and are never downloaded. They come from the
            Hot Wheels Wiki and are reused under the {ARTWORK.license.name} license.
          </RText>
          <RText variant="bodySmall" style={styles.body}>{ARTWORK.license.modifications}</RText>
          <RText variant="bodySmall" style={styles.body}>
            Photographs by {ARTWORK_UPLOADERS.join(', ')}.
          </RText>
          <RText variant="eyebrow" style={styles.meta}>
            {CATALOG.length - ARTWORK_COUNT} catalog entries have no wiki photo and show a
            placeholder instead.
          </RText>
          <ExternalLink label={`${ARTWORK.license.abbreviation} license terms`} url={ARTWORK.license.url} />
          <ExternalLink label="Photo source page" url={ARTWORK.source.revisionUrl} />
        </View>

        <View style={styles.section}><SectionHeader title="Source licensing" /></View>
        <View style={styles.card}>
          <RText variant="bodySmall" style={styles.body}>
            {
              "Fandom's general licensing page and the Hot Wheels Wiki copyright page describe the applicable source terms differently. Redline ID preserves both references rather than claiming a single license."
            }
          </RText>
          {licensing.map((license) => (
            <ExternalLink key={license.url} label={license.name} url={license.url} />
          ))}
          <ExternalLink label="Full third-party notices" url={NOTICES_URL} />
        </View>

        <View style={styles.section}><SectionHeader title="Bundled fonts" /></View>
        <View style={styles.card}>
          <RText style={styles.cardTitle}>Barlow & Barlow Condensed</RText>
          <RText variant="bodySmall" style={styles.body}>Copyright 2017 The Barlow Project Authors.</RText>
          <RText style={styles.cardTitle}>Chakra Petch</RText>
          <RText variant="bodySmall" style={styles.body}>Copyright 2018 The Chakra Petch Project Authors.</RText>
          <RText variant="bodySmall" style={styles.body}>
            Licensed under the SIL Open Font License 1.1. Fonts are bundled unmodified
            and work offline.
          </RText>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showFontLicense }}
            onPress={() => setShowFontLicense((shown) => !shown)}
            style={({ pressed }) => [styles.fontLicenseButton, pressed && styles.pressed]}
          >
            <RText style={styles.linkText}>{showFontLicense ? 'Hide' : 'Read'} font licenses</RText>
          </Pressable>
          {showFontLicense && (
            <RText variant="bodySmall" selectable style={styles.body}>
              {fontLicenses.barlow}{'\n'}{fontLicenses.chakraPetch}
            </RText>
          )}
        </View>

        <View style={styles.section}><SectionHeader title="Privacy" /></View>
        <View style={styles.card}>
          <RText variant="bodySmall" style={styles.body}>
            Redline ID has no account, analytics, ads, crash reporting, or application server. It
            does not automatically transmit race or garage data.
          </RText>
          <RText variant="bodySmall" style={styles.body}>
            Share actions open the OS share sheet. Nothing is sent until you choose a destination;
            that destination&apos;s privacy terms apply.
          </RText>
          <ExternalLink label="Read the privacy policy" url={PRIVACY_URL} />
        </View>

        <RText variant="bodySmall" style={styles.disclaimer}>
          Redline ID is independent and community built. It is not affiliated with, endorsed by, or
          sponsored by Mattel, Inc. or Fandom, Inc.
        </RText>
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
      accessibilityRole="link"
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <RText style={styles.linkText}>{label} ↗</RText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  header: { paddingHorizontal: 16, paddingBottom: 6, width: '100%', alignSelf: 'center' },
  subtitle: { color: colorsR.inkSecondary, marginTop: 4 },
  content: { paddingHorizontal: 16, gap: 8, width: '100%', alignSelf: 'center' },
  section: { marginTop: 16 },
  card: { backgroundColor: colorsR.pitLane, padding: 14, gap: 8 },
  cardTitle: { fontFamily: fontR.bodySemi, color: colorsR.chalk },
  body: { color: colorsR.inkSecondary },
  meta: { fontFamily: fontR.hud, letterSpacing: 1, color: colorsR.inkMuted },
  link: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingRight: 8 },
  fontLicenseButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontFamily: fontR.bodySemi, fontSize: 14, color: colorsR.electric },
  disclaimer: { fontSize: 12, lineHeight: 17, color: colorsR.inkMuted, marginTop: 20 },
  pressed: { opacity: 0.7 },
});

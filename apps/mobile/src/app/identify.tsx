/**
 * Identify modal — pick the real Hot Wheels casting for the tag `uid` from the
 * bundled catalog (ADR-0013). Manual by design: a decoded car only carries an
 * opaque casting key, so the user matches it to a name/photo here once and every
 * copy of that casting is named thereafter.
 */
import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { CarPhoto } from "@/catalog/CarPhoto";
import { catalogMeta, searchCatalog, type CatalogCar } from "@/catalog/catalog";
import { useCarIdentity, useCastingCoverage, useIdentifyCar } from "@/catalog/useCarIdentity";
import { colors, elevation, fontSize, fontWeight, radius, spacing } from "@/theme/tokens";

export default function IdentifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();

  const [query, setQuery] = useState("");
  const results = useMemo(() => searchCatalog(query), [query]);
  const current = useCarIdentity(uid);
  const coverage = useCastingCoverage(uid);
  const identify = useIdentifyCar();

  const pick = (car: CatalogCar) => {
    identify(uid, car.id);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing(2) }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Identify car</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {current
              ? `Currently: ${current.name}`
              : coverage && coverage.otherCars > 0
                ? `Match once to label this car + ${coverage.otherCars} other ${coverage.otherCars === 1 ? "copy" : "copies"}`
                : "Match this tag to a real casting"}
          </Text>
        </View>
        <Pressable
          hitSlop={12}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Text style={styles.closeText}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colors.textMuted}
          style={styles.searchIcon}
        />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, series, toy #, wave, color, or year"
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(c) => c.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: insets.bottom + spacing(6) },
          results.length === 0 && styles.gridEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <CarCard car={item} selected={item.id === current?.id} onPress={() => pick(item)} />
        )}
        ListEmptyComponent={
          <Text style={styles.noResults}>No cars match “{query.trim()}”.</Text>
        }
      />
    </View>
  );
}

function CarCard({
  car,
  selected,
  onPress,
}: {
  car: CatalogCar;
  selected: boolean;
  onPress: () => void;
}) {
  const primaryMeta = catalogMeta(car).slice(0, 2).join(" · ");
  const secondaryMeta = catalogMeta(car).slice(2).join(" · ");
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
    >
      <View style={styles.cardPhotoWrap}>
        <CarPhoto uri={car.image} width="100%" aspectRatio={1} rounded={radius.sm} ring={selected} />
        {selected ? (
          <View style={styles.checkBadge}>
            <MaterialCommunityIcons name="check" size={15} color={colors.bg} />
          </View>
        ) : null}
      </View>
      <Text style={styles.cardName} numberOfLines={2}>
        {car.name}
      </Text>
      {primaryMeta ? (
        <Text style={styles.cardMeta} numberOfLines={1}>
          {primaryMeta}
        </Text>
      ) : null}
      {secondaryMeta ? (
        <Text style={styles.cardMetaSecondary} numberOfLines={1}>
          {secondaryMeta}
        </Text>
      ) : null}
      {car.wikiPage ? (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            void WebBrowser.openBrowserAsync(car.wikiPage!);
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.wikiLink, pressed && styles.pressed]}
        >
          <Text style={styles.wikiLinkText}>View wiki</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  headerText: { flex: 1, gap: 2 },
  title: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.heavy },
  subtitle: { color: colors.textSecondary, fontSize: fontSize.sm },
  close: { paddingVertical: spacing(1), paddingHorizontal: spacing(2) },
  closeText: { color: colors.accentBlue, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing(5),
    marginBottom: spacing(3),
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
  },
  searchIcon: { marginRight: spacing(2) },
  search: {
    flex: 1,
    paddingVertical: spacing(3),
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  grid: { paddingHorizontal: spacing(5), gap: spacing(3) },
  gridRow: { gap: spacing(3) },
  gridEmpty: { flexGrow: 1, justifyContent: "center" },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    gap: spacing(2),
  },
  cardSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceRaised, ...elevation.accentGlow },
  cardPhotoWrap: { width: "100%" },
  checkBadge: {
    position: "absolute",
    top: spacing(2),
    right: spacing(2),
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  cardMeta: { color: colors.textSecondary, fontSize: fontSize.xs },
  cardMetaSecondary: { color: colors.textMuted, fontSize: fontSize.xs },
  wikiLink: { marginTop: "auto", alignSelf: "flex-start", paddingTop: spacing(1) },
  wikiLinkText: { color: colors.accentBlue, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  noResults: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: "center" },
  pressed: { opacity: 0.7 },
});

/**
 * Identify modal — pick the real Hot Wheels casting for the tag `uid` from the
 * bundled catalog (ADR-0013). Manual by design: a decoded car only carries an
 * opaque casting key, so the user matches it to a name/photo here once and every
 * copy of that casting is named thereafter.
 * Redline layout (SPEC §4.12): ScreenHeader, skewed filter chips in scroll rows,
 * an inset search field and catalog cards in the Garage card info layout.
 */
import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { CarPhoto } from "@/catalog/CarPhoto";
import {
  CATALOG,
  CATALOG_WAVES,
  CATALOG_YEARS,
  catalogMeta,
  searchCatalog,
  type CatalogCar,
} from "@/catalog/catalog";
import {
  undoIdentification,
  useCarIdentity,
  useCastingCoverage,
  useIdentifyCar,
  type IdentificationChange,
} from "@/catalog/useCarIdentity";
import { FilterChip, RaceButton, RText, ScreenHeader, SkewBox } from "@/components/redline";
import { padGrid } from "@/garage/cardModel";
import { decorative } from "@/components/redline/decorative";
import { colorsR, fontR } from "@/theme/tokens";

type IdentifyMode = "catalog" | "toyNumber";

export default function IdentifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { uid } = useLocalSearchParams<{ uid: string }>();

  const [mode, setMode] = useState<IdentifyMode>("catalog");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [wave, setWave] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<CatalogCar>();
  const [undo, setUndo] = useState<{ change: IdentificationChange; car: CatalogCar }>();
  const availableWaves = useMemo(
    () =>
      CATALOG_WAVES.filter(
        (candidateWave) =>
          year === null ||
          CATALOG.some((car) => car.year === year && car.wave === candidateWave),
      ),
    [year],
  );
  const results = useMemo(
    () =>
      searchCatalog(mode === "catalog" ? query : "", {
        year,
        wave,
        toyNumber: mode === "toyNumber" ? query : undefined,
      }),
    [mode, query, wave, year],
  );
  const current = useCarIdentity(uid);
  const coverage = useCastingCoverage(uid);
  const identify = useIdentifyCar();

  const chooseMode = (nextMode: IdentifyMode) => {
    setMode(nextMode);
    setQuery("");
    if (nextMode === "toyNumber") {
      setYear(null);
      setWave(null);
    }
    setCandidate(undefined);
  };

  const confirmPick = () => {
    if (!candidate) return;
    const change = identify(uid, candidate.id);
    if (!change) return;
    setUndo({ change, car: candidate });
    setCandidate(undefined);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  };

  const undoPick = () => {
    if (!undo) return;
    undoIdentification(undo.change);
    setUndo(undefined);
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <ScreenHeader
          title="Identify"
          subtitle={
            current
              ? `Currently: ${current.name}`
              : coverage && coverage.otherCars > 0
                ? `Match once to label this car + ${coverage.otherCars} other ${coverage.otherCars === 1 ? "copy" : "copies"}`
                : "Match this tag to a real casting"
          }
          right={
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Done"
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <RText style={styles.closeText}>Done</RText>
            </Pressable>
          }
        />
      </View>

      <View style={styles.modeRow} accessibilityRole="tablist">
        <FilterChip
          label="Browse catalog"
          selected={mode === "catalog"}
          onPress={() => chooseMode("catalog")}
        />
        <FilterChip
          label="Package toy #"
          selected={mode === "toyNumber"}
          onPress={() => chooseMode("toyNumber")}
        />
      </View>

      <View style={styles.searchRow}>
        <MaterialCommunityIcons
          name="magnify"
          size={20}
          color={colorsR.inkMuted}
          style={styles.searchIcon}
        />
        <TextInput
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setCandidate(undefined);
          }}
          placeholder={
            mode === "toyNumber"
              ? "Enter package toy number, e.g. FXB03"
              : "Search name, series, toy #, wave, or year"
          }
          placeholderTextColor={colorsR.inkMuted}
          style={styles.search}
          accessibilityLabel={mode === "toyNumber" ? "Package toy number" : "Search the catalog"}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <RText variant="eyebrow" style={styles.filterLabel}>YEAR</RText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            <FilterChip
              label="All"
              selected={year === null}
              onPress={() => {
                setYear(null);
                setWave(null);
                setCandidate(undefined);
              }}
            />
            {CATALOG_YEARS.map((option) => (
              <FilterChip
                key={option}
                label={String(option)}
                selected={year === option}
                onPress={() => {
                  setYear(option);
                  setWave(null);
                  setCandidate(undefined);
                }}
              />
            ))}
          </ScrollView>
        </View>
        <View style={styles.filterGroup}>
          <RText variant="eyebrow" style={styles.filterLabel}>WAVE</RText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChips}>
            <FilterChip
              label="All"
              selected={wave === null}
              onPress={() => {
                setWave(null);
                setCandidate(undefined);
              }}
            />
            {availableWaves.map((option) => (
              <FilterChip
                key={option}
                label={option.replace(" Series ", " S")}
                selected={wave === option}
                onPress={() => {
                  setWave(option);
                  setCandidate(undefined);
                }}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      {candidate ? (
        <View style={styles.confirmPanel}>
          <View {...decorative} style={[styles.panelBar, { backgroundColor: colorsR.electric }]} />
          <View style={styles.confirmText}>
            <RText variant="carName" style={styles.confirmTitle}>Confirm {candidate.name}?</RText>
            <RText variant="bodySmall" style={styles.confirmBody}>
              This labels this casting
              {coverage && coverage.otherCars > 0
                ? ` and ${coverage.otherCars} matching ${coverage.otherCars === 1 ? "copy" : "copies"}`
                : ""}
              . You can undo after saving.
            </RText>
          </View>
          <View style={styles.confirmActions}>
            <RaceButton variant="ghost" compact label="Cancel" onPress={() => setCandidate(undefined)} />
            <RaceButton compact label="Confirm" onPress={confirmPick} />
          </View>
        </View>
      ) : undo ? (
        <View style={styles.savedPanel}>
          <View {...decorative} style={[styles.panelBar, { backgroundColor: colorsR.greenFlag }]} />
          <RText variant="bodySmall" style={styles.savedText} numberOfLines={2}>
            Saved {undo.car.name}
          </RText>
          <Pressable onPress={undoPick} accessibilityRole="button" accessibilityLabel={`Undo identifying as ${undo.car.name}`} style={({ pressed }) => [styles.undo, pressed && styles.pressed]}>
            <RText style={styles.undoText}>Undo</RText>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        // Spacers keep a lone last card at its column width.
        data={padGrid(results, 2)}
        keyExtractor={(c, i) => c?.id ?? `spacer-${i}`}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: insets.bottom + 24 },
          results.length === 0 && styles.gridEmpty,
        ]}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => !item ? <View style={styles.spacer} /> : (
          <CarCard
            car={item}
            selected={item.id === current?.id}
            candidate={item.id === candidate?.id}
            onPress={() => setCandidate(item)}
          />
        )}
        ListEmptyComponent={
          <RText variant="bodySmall" style={styles.noResults}>No cars match “{query.trim()}”.</RText>
        }
      />
    </View>
  );
}

function CarCard({
  car,
  selected,
  candidate,
  onPress,
}: {
  car: CatalogCar;
  selected: boolean;
  candidate: boolean;
  onPress: () => void;
}) {
  const primaryMeta = catalogMeta(car).slice(0, 2).join(" · ");
  const secondaryMeta = catalogMeta(car).slice(2).join(" · ");
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[car.name, primaryMeta, secondaryMeta, selected ? "current identity" : null].filter(Boolean).join(", ")}
      accessibilityState={{ selected: selected || candidate }}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        candidate && styles.cardCandidate,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.cardPhotoWrap}>
        <CarPhoto carId={car.id} width="100%" aspectRatio={4 / 3} rounded={0} />
        {car.toyNumber ? (
          <SkewBox angle={-14} style={styles.toyRibbon}>
            <RText variant="chip" style={styles.toyText}>{car.toyNumber}</RText>
          </SkewBox>
        ) : null}
        {selected ? (
          <View style={styles.checkBadge}>
            <MaterialCommunityIcons name="check" size={15} color={colorsR.asphalt} />
          </View>
        ) : null}
      </View>
      <View style={styles.cardInfo}>
        <RText variant="carName" style={styles.cardName} numberOfLines={2}>
          {car.name}
        </RText>
        {primaryMeta ? (
          <RText variant="bodySmall" style={styles.cardMeta} numberOfLines={1}>
            {primaryMeta}
          </RText>
        ) : null}
        {secondaryMeta ? (
          <RText variant="eyebrow" style={styles.cardMetaSecondary} numberOfLines={1}>
            {secondaryMeta}
          </RText>
        ) : null}
        {car.wikiPage ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              void WebBrowser.openBrowserAsync(car.wikiPage!);
            }}
            accessibilityRole="link"
            accessibilityLabel={`View ${car.name} on the wiki`}
            style={({ pressed }) => [styles.wikiLink, pressed && styles.pressed]}
          >
            <RText style={styles.wikiLinkText}>View wiki ↗</RText>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colorsR.asphalt },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  close: { minHeight: 44, minWidth: 44, alignItems: "flex-end", justifyContent: "center" },
  closeText: { fontFamily: fontR.bodySemi, color: colorsR.electric },
  modeRow: { flexDirection: "row", paddingHorizontal: 12, marginBottom: 6 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: colorsR.inset,
    borderColor: colorsR.fieldBorder,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchIcon: { marginRight: 8 },
  search: { flex: 1, paddingVertical: 10, color: colorsR.chalk, fontFamily: fontR.body, fontSize: 16 },
  filters: { paddingBottom: 10, gap: 4 },
  filterGroup: { gap: 0 },
  filterLabel: { fontFamily: fontR.hud, color: colorsR.inkMuted, paddingHorizontal: 16 },
  filterChips: { paddingHorizontal: 12 },
  confirmPanel: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingTop: 15,
    paddingHorizontal: 14,
    paddingBottom: 12,
    backgroundColor: colorsR.pitLane,
    gap: 10,
    overflow: "hidden",
  },
  panelBar: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  confirmText: { gap: 4 },
  confirmTitle: { fontSize: 20, lineHeight: 22 },
  confirmBody: { color: colorsR.inkSecondary },
  confirmActions: { flexDirection: "row", justifyContent: "flex-end", gap: 4 },
  savedPanel: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingTop: 8,
    paddingLeft: 14,
    backgroundColor: colorsR.pitLane,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  savedText: { flex: 1, fontFamily: fontR.bodySemi, color: colorsR.chalk },
  undo: { minHeight: 44, minWidth: 64, alignItems: "center", justifyContent: "center" },
  undoText: { fontFamily: fontR.bodySemi, color: colorsR.electric },
  grid: { paddingHorizontal: 16, gap: 12 },
  gridRow: { gap: 12 },
  gridEmpty: { flexGrow: 1, justifyContent: "center" },
  spacer: { flex: 1 },
  card: { flex: 1, backgroundColor: colorsR.pitLane, overflow: "hidden" },
  cardSelected: { borderWidth: 2, borderColor: colorsR.flame },
  cardCandidate: { borderWidth: 2, borderColor: colorsR.electric },
  cardPhotoWrap: { width: "100%" },
  toyRibbon: { position: "absolute", right: -6, top: 10, backgroundColor: colorsR.gridBox, paddingVertical: 3, paddingLeft: 8, paddingRight: 12 },
  toyText: { fontSize: 10, lineHeight: 12, color: colorsR.inkSecondary },
  checkBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colorsR.flame,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, paddingTop: 10, paddingHorizontal: 12, paddingBottom: 4, gap: 4 },
  cardName: { fontSize: 18, lineHeight: 19 },
  cardMeta: { fontSize: 12, lineHeight: 16, color: colorsR.inkSecondary },
  cardMetaSecondary: { fontFamily: fontR.hud, fontSize: 10, lineHeight: 12, letterSpacing: 0.5, color: colorsR.inkMuted },
  wikiLink: { marginTop: "auto", alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  wikiLinkText: { fontFamily: fontR.bodySemi, fontSize: 13, color: colorsR.electric },
  noResults: { color: colorsR.inkSecondary, textAlign: "center" },
  pressed: { opacity: 0.7 },
});

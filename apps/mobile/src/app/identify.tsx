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
import { colors, elevation, fontSize, fontWeight, radius, spacing } from "@/theme/tokens";

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

      <View style={styles.modeRow}>
        <FilterChip
          label="Browse catalog"
          active={mode === "catalog"}
          onPress={() => chooseMode("catalog")}
        />
        <FilterChip
          label="Package toy #"
          active={mode === "toyNumber"}
          onPress={() => chooseMode("toyNumber")}
        />
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
          onChangeText={(value) => {
            setQuery(value);
            setCandidate(undefined);
          }}
          placeholder={
            mode === "toyNumber"
              ? "Enter package toy number, e.g. FXB03"
              : "Search name, series, toy #, wave, or year"
          }
          placeholderTextColor={colors.textMuted}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      <View style={styles.filters}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Year</Text>
          <View style={styles.filterChips}>
            <FilterChip
              label="All"
              active={year === null}
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
                active={year === option}
                onPress={() => {
                  setYear(option);
                  setWave(null);
                  setCandidate(undefined);
                }}
              />
            ))}
          </View>
        </View>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Wave</Text>
          <View style={styles.filterChips}>
            <FilterChip
              label="All"
              active={wave === null}
              onPress={() => {
                setWave(null);
                setCandidate(undefined);
              }}
            />
            {availableWaves.map((option) => (
              <FilterChip
                key={option}
                label={option.replace(" Series ", " S")}
                active={wave === option}
                onPress={() => {
                  setWave(option);
                  setCandidate(undefined);
                }}
              />
            ))}
          </View>
        </View>
      </View>

      {candidate ? (
        <View style={styles.confirmPanel}>
          <View style={styles.confirmText}>
            <Text style={styles.confirmTitle}>Confirm {candidate.name}?</Text>
            <Text style={styles.confirmBody}>
              This labels this casting
              {coverage && coverage.otherCars > 0
                ? ` and ${coverage.otherCars} matching ${coverage.otherCars === 1 ? "copy" : "copies"}`
                : ""}
              . You can undo after saving.
            </Text>
          </View>
          <View style={styles.confirmActions}>
            <Pressable
              onPress={() => setCandidate(undefined)}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={confirmPick}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.primaryButtonText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      ) : undo ? (
        <View style={styles.savedPanel}>
          <Text style={styles.savedText} numberOfLines={2}>
            Saved {undo.car.name}
          </Text>
          <Pressable onPress={undoPick} hitSlop={8}>
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        </View>
      ) : null}

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
          <CarCard
            car={item}
            selected={item.id === current?.id}
            candidate={item.id === candidate?.id}
            onPress={() => setCandidate(item)}
          />
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
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        candidate && styles.cardCandidate,
        pressed && styles.pressed,
      ]}
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

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active && styles.filterChipActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
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
  modeRow: {
    flexDirection: "row",
    gap: spacing(2),
    paddingHorizontal: spacing(5),
    marginBottom: spacing(2),
  },
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
  filters: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    gap: spacing(2),
  },
  filterGroup: { gap: spacing(1) },
  filterLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  filterChips: { flexDirection: "row", flexWrap: "wrap", gap: spacing(1.5) },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
  },
  filterChipActive: { borderColor: colors.accentBlue, backgroundColor: colors.accentBlueSoft },
  filterChipText: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  filterChipTextActive: { color: colors.accentBlue },
  confirmPanel: {
    marginHorizontal: spacing(5),
    marginBottom: spacing(3),
    padding: spacing(3),
    borderWidth: 1,
    borderColor: colors.accentBlue,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    gap: spacing(3),
  },
  confirmText: { gap: spacing(1) },
  confirmTitle: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  confirmBody: { color: colors.textSecondary, fontSize: fontSize.sm },
  confirmActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing(2) },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  secondaryButtonText: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
  },
  primaryButtonText: { color: colors.bg, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  savedPanel: {
    marginHorizontal: spacing(5),
    marginBottom: spacing(3),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2.5),
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
  },
  savedText: { flex: 1, color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  undoText: { color: colors.accentBlue, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
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
  cardCandidate: { borderColor: colors.accentBlue, backgroundColor: colors.surfaceRaised },
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

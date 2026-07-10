import { Pressable, Text, TextInput, View } from "react-native";

import { colors } from "../../theme/tokens";
import { LAP_OPTIONS, type LapOption } from "../raceEngine";
import type { RaceNightLineup } from "../raceNight";
import type { RaceCarPresentation, RaceMode } from "../presentation";
import { RaceCar } from "./RaceCar";
import { RaceNightLineup as Lineup } from "./RaceNightLineup";
import { raceStyles as styles } from "./styles";

type ResolveCar = (
  uid: string | null,
  emptyLabel?: string,
) => RaceCarPresentation;

interface RaceSetupProps {
  readonly mode: RaceMode;
  readonly laps: LapOption;
  readonly soloPlayer: string;
  readonly racerDraft: string;
  readonly lineup: RaceNightLineup;
  readonly liveCarUid: string | null;
  readonly resolveCar: ResolveCar;
  readonly canStart: boolean;
  readonly onModeChange: (mode: RaceMode) => void;
  readonly onLapsChange: (laps: LapOption) => void;
  readonly onSoloPlayerChange: (name: string) => void;
  readonly onRacerDraftChange: (name: string) => void;
  readonly onAddRacer: () => void;
  readonly onStart: () => void;
  readonly onChooseNext: (racerId: string) => void;
  readonly onRemove: (racerId: string) => void;
  readonly onAssignCar: (racerId: string) => void;
}

export function RaceSetup({
  mode,
  laps,
  soloPlayer,
  racerDraft,
  lineup,
  liveCarUid,
  resolveCar,
  canStart,
  onModeChange,
  onLapsChange,
  onSoloPlayerChange,
  onRacerDraftChange,
  onAddRacer,
  onStart,
  onChooseNext,
  onRemove,
  onAssignCar,
}: RaceSetupProps) {
  const canAddRacer = racerDraft.trim().length > 0;
  const liveCar = resolveCar(liveCarUid, "No car on portal");

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>How are you racing?</Text>
      <View style={styles.modeToggle}>
        <Pressable
          onPress={() => onModeChange("solo")}
          accessibilityRole="button"
          accessibilityLabel="Solo race"
          accessibilityHint="A quick race for one player"
          accessibilityState={{ selected: mode === "solo" }}
          style={({ pressed }) => [
            styles.modeOption,
            mode === "solo" && styles.modeOptionActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.modeTitle, mode === "solo" && styles.modeTitleActive]}>Solo</Text>
          <Text style={styles.modeDescription}>Name, laps, start. No lineup required.</Text>
        </Pressable>
        <Pressable
          onPress={() => onModeChange("raceNight")}
          accessibilityRole="button"
          accessibilityLabel="Race night"
          accessibilityHint="Build a multi-racer lineup with assigned cars"
          accessibilityState={{ selected: mode === "raceNight" }}
          style={({ pressed }) => [
            styles.modeOption,
            mode === "raceNight" && styles.modeOptionActive,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.modeTitle, mode === "raceNight" && styles.modeTitleActive]}>
            Race night
          </Text>
          <Text style={styles.modeDescription}>Set the order, cars, and next racer.</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Race length</Text>
      <View style={styles.chips}>
        {LAP_OPTIONS.map((option) => {
          const selected = laps === option;
          return (
            <Pressable
              key={option}
              onPress={() => onLapsChange(option)}
              accessibilityRole="button"
              accessibilityLabel={`${option} laps`}
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option}</Text>
              <Text style={[styles.chipUnit, selected && styles.chipTextActive]}>laps</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === "solo" ? (
        <>
          <Text style={styles.sectionLabel}>Player</Text>
          <TextInput
            value={soloPlayer}
            onChangeText={onSoloPlayerChange}
            placeholder="Player 1"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={24}
            returnKeyType="done"
            autoCorrect={false}
            accessibilityLabel="Solo player name"
          />
          <View style={styles.card}>
            <Text style={styles.cardHeading}>Car for this race</Text>
            <RaceCar
              car={liveCar}
              context={liveCarUid ? "Currently on the portal" : "Place a car on the portal"}
            />
          </View>
          <Pressable
            onPress={onStart}
            disabled={!canStart}
            accessibilityRole="button"
            accessibilityLabel="Start solo race"
            accessibilityHint={
              canStart ? "Begins the race countdown" : "Connect the portal before starting"
            }
            accessibilityState={{ disabled: !canStart }}
            style={({ pressed }) => [
              styles.primaryBtn,
              !canStart && styles.btnDisabled,
              pressed && canStart && styles.pressed,
            ]}
          >
            <Text style={[styles.primaryBtnText, !canStart && styles.btnDisabledText]}>
              Start solo race
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Add racer</Text>
          <TextInput
            value={racerDraft}
            onChangeText={onRacerDraftChange}
            onSubmitEditing={canAddRacer ? onAddRacer : undefined}
            placeholder="Racer name"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={24}
            returnKeyType="done"
            autoCorrect={false}
            accessibilityLabel="Racer name"
            accessibilityHint="The car currently on the portal will be assigned when added"
          />
          <View style={styles.actionRow}>
            <View style={styles.flex1}>
              <RaceCar
                car={liveCar}
                size={48}
                context={liveCarUid ? "Will be assigned when added" : "No car will be assigned"}
              />
            </View>
            <Pressable
              onPress={onAddRacer}
              disabled={!canAddRacer}
              accessibilityRole="button"
              accessibilityLabel={
                canAddRacer ? `Add ${racerDraft.trim()} to lineup` : "Add racer to lineup"
              }
              accessibilityState={{ disabled: !canAddRacer }}
              style={({ pressed }) => [
                styles.ghostBtn,
                !canAddRacer && styles.btnDisabled,
                pressed && canAddRacer && styles.pressed,
              ]}
            >
              <Text style={[styles.ghostBtnText, !canAddRacer && styles.btnDisabledText]}>
                Add racer
              </Text>
            </Pressable>
          </View>
          <Lineup
            lineup={lineup}
            liveCarUid={liveCarUid}
            resolveCar={resolveCar}
            canStart={canStart}
            onStart={onStart}
            onChooseNext={onChooseNext}
            onRemove={onRemove}
            onAssignCar={onAssignCar}
          />
        </>
      )}
    </View>
  );
}

import { Pressable, Text, View } from "react-native";

import {
  carForCurrentRacer,
  type RaceNightLineup,
  type RaceNightRacer,
} from "../raceNight";
import type { RaceCarPresentation } from "../presentation";
import { RaceCar } from "./RaceCar";
import { raceStyles as styles } from "./styles";

type ResolveCar = (
  uid: string | null,
  emptyLabel?: string,
) => RaceCarPresentation;

interface RaceNightLineupProps {
  readonly lineup: RaceNightLineup;
  readonly liveCarUid: string | null;
  readonly resolveCar: ResolveCar;
  readonly canStart: boolean;
  readonly onStart: () => void;
  readonly onChooseNext: (racerId: string) => void;
  readonly onRemove: (racerId: string) => void;
  readonly onAssignCar: (racerId: string) => void;
}

function AssignmentActions({
  racer,
  liveCarUid,
  liveCarName,
  showMakeNext,
  onChooseNext,
  onRemove,
  onAssignCar,
}: {
  readonly racer: RaceNightRacer;
  readonly liveCarUid: string | null;
  readonly liveCarName: string;
  readonly showMakeNext: boolean;
  readonly onChooseNext: (racerId: string) => void;
  readonly onRemove: (racerId: string) => void;
  readonly onAssignCar: (racerId: string) => void;
}) {
  const canAssign = liveCarUid != null && liveCarUid !== racer.carUid;
  return (
    <View style={styles.queueActions}>
      {showMakeNext ? (
        <Pressable
          onPress={() => onChooseNext(racer.id)}
          accessibilityRole="button"
          accessibilityLabel={`Make ${racer.name} the next racer`}
          style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}
        >
          <Text style={styles.smallBtnText}>Make next</Text>
        </Pressable>
      ) : null}
      {canAssign ? (
        <Pressable
          onPress={() => onAssignCar(racer.id)}
          accessibilityRole="button"
          accessibilityLabel={`Assign ${liveCarName} to ${racer.name}`}
          style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}
        >
          <Text style={styles.smallBtnText}>Assign portal car</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => onRemove(racer.id)}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${racer.name} from the lineup`}
        style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}
      >
        <Text style={styles.removeBtnText}>Remove</Text>
      </Pressable>
    </View>
  );
}

export function RaceNightLineup({
  lineup,
  liveCarUid,
  resolveCar,
  canStart,
  onStart,
  onChooseNext,
  onRemove,
  onAssignCar,
}: RaceNightLineupProps) {
  if (lineup.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardHeading}>Race-night lineup</Text>
        <Text style={styles.empty}>
          Add the first racer above. Their current portal car will be saved with their turn.
        </Text>
      </View>
    );
  }

  const current = lineup[0];
  const next = lineup[1] ?? null;
  const queued = lineup.slice(2);
  const liveCar = resolveCar(liveCarUid, "No car on portal");
  const currentCar = resolveCar(
    carForCurrentRacer(lineup, liveCarUid),
    "Car on portal at start",
  );

  return (
    <>
      <View style={[styles.card, styles.cardRaised]}>
        <View>
          <Text style={styles.lineupLabel}>Current racer</Text>
          <Text style={styles.lineupName} numberOfLines={1}>
            {current.name}
          </Text>
        </View>
        <RaceCar
          car={currentCar}
          context={current.carUid ? "Assigned to this racer" : "Uses the portal car at start"}
        />
        <AssignmentActions
          racer={current}
          liveCarUid={liveCarUid}
          liveCarName={liveCar.name}
          showMakeNext={false}
          onChooseNext={onChooseNext}
          onRemove={onRemove}
          onAssignCar={onAssignCar}
        />
        <Pressable
          onPress={onStart}
          disabled={!canStart}
          accessibilityRole="button"
          accessibilityLabel={`Start race for ${current.name}`}
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
            Start {current.name}
          </Text>
        </Pressable>
      </View>

      {next ? (
        <View style={[styles.card, styles.cardNext]}>
          <View>
            <Text style={styles.lineupLabel}>Up next</Text>
            <Text style={styles.lineupNameNext} numberOfLines={1}>
              {next.name}
            </Text>
          </View>
          <RaceCar
            car={resolveCar(next.carUid)}
            size={48}
            context={next.carUid ? "Assigned to this racer" : "Uses the portal car at start"}
          />
          <AssignmentActions
            racer={next}
            liveCarUid={liveCarUid}
            liveCarName={liveCar.name}
            showMakeNext={false}
            onChooseNext={onChooseNext}
            onRemove={onRemove}
            onAssignCar={onAssignCar}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Up next</Text>
          <Text style={styles.empty}>No one else is queued. Add another racer for a rotation.</Text>
        </View>
      )}

      {queued.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Later in the lineup</Text>
          {queued.map((racer, index) => {
            const car = resolveCar(racer.carUid);
            return (
              <View key={racer.id} style={styles.queueRow}>
                <View style={styles.queueBody}>
                  <Text style={styles.lineupLabel}>Position {index + 3}</Text>
                  <Text style={styles.queueName} numberOfLines={1}>
                    {racer.name}
                  </Text>
                  <Text style={styles.queueMeta} numberOfLines={1}>
                    {car.name}
                  </Text>
                </View>
                <AssignmentActions
                  racer={racer}
                  liveCarUid={liveCarUid}
                  liveCarName={liveCar.name}
                  showMakeNext
                  onChooseNext={onChooseNext}
                  onRemove={onRemove}
                  onAssignCar={onAssignCar}
                />
              </View>
            );
          })}
        </View>
      ) : null}
    </>
  );
}

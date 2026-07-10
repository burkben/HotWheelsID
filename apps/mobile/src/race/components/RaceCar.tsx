import { Text, View } from "react-native";

import { CarPhoto } from "../../catalog/CarPhoto";
import type { RaceCarPresentation } from "../presentation";
import { raceStyles as styles } from "./styles";

export function RaceCar({
  car,
  size = 56,
  context,
}: {
  readonly car: RaceCarPresentation;
  readonly size?: number;
  readonly context?: string;
}) {
  const meta = context ?? (car.identified ? "Identified car" : car.uid ? "Unidentified car" : "Flexible assignment");
  return (
    <View
      style={styles.carSummary}
      accessible
      accessibilityLabel={`${car.name}. ${meta}`}
    >
      <CarPhoto key={car.image ?? car.uid ?? "unassigned"} uri={car.image} size={size} />
      <View style={styles.carText}>
        <Text style={styles.carName} numberOfLines={2}>
          {car.name}
        </Text>
        <Text style={styles.carMeta}>{meta}</Text>
      </View>
    </View>
  );
}

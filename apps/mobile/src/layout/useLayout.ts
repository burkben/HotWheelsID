/**
 * `useLayout` — the React binding for {@link resolveLayout}.
 *
 * Split out from the pure module so tests can exercise the breakpoints under
 * plain Node while screens get a hook that re-renders on rotation, Split View
 * resizes, and Stage Manager window drags.
 */
import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { resolveLayout, type Layout } from "./layout";

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return useMemo(() => resolveLayout(width, height), [width, height]);
}

export { resolveLayout, TABLET_MIN_WIDTH, TWO_PANE_MIN_WIDTH } from "./layout";
export type { Layout, PaneMode } from "./layout";

/**
 * Test-only stand-in for `react-native`.
 *
 * The real package ships Flow-typed source that the test runner cannot parse.
 * Tests here never mount a component — they call it and inspect the element tree
 * it returns — so the host components only need stable identities and
 * `StyleSheet.create` only needs to be a pass-through.
 */
export const View = "View";
export const Text = "Text";
export const Image = "Image";

export const StyleSheet = {
  create: <T extends Record<string, object>>(styles: T): T => styles,
};

/** Mirrors the `DimensionValue` type import in component modules. */
export type DimensionValue = number | `${number}%` | "auto" | null;

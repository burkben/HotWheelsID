/**
 * Web bundler stub for the native SQLite adapter.
 *
 * `initPersistence` probes the Expo native-module registry and never calls this
 * function on web. Keeping a platform file here prevents Metro from traversing
 * expo-sqlite's worker/WASM graph during static export.
 */
export async function openRedlineDb(): Promise<never> {
  throw new Error("SQLite persistence is unavailable on web");
}

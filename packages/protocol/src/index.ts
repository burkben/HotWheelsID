/**
 * `@redlineid/protocol` — pure TypeScript port of the Hot Wheels id Race
 * Portal BLE protocol (UUIDs, typed events, and byte decoders).
 *
 * No React Native, BLE, DOM, or Node dependencies — safe to unit-test in plain
 * Node and to reuse from any TypeScript client. See `PROTOCOL.md` (repo root).
 */
export * from "./uuids";
export * from "./events";
export * from "./decode";
export * from "./base64";
export * from "./mpid";

import type { ConnectionState, CurrentCar } from '@/store/portalStore';
import type { PortalMode } from '@/portal/controller';

/** A live Speed-tab state, not persisted onboarding. Scanning stays visible. */
export function shouldShowFindPortal({ connection, car, passCount, mode }: {
  connection: ConnectionState;
  car: CurrentCar | null;
  passCount: number;
  mode: PortalMode;
}): boolean {
  return mode === 'live' && connection !== 'connected' && car == null && passCount === 0;
}

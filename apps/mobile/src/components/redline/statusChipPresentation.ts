import type { StatusPillProps } from '../StatusPill';
import { portalStatusPresentation } from '@/portal/selectors';

export function statusChipPresentation(input: Pick<StatusPillProps, 'connection' | 'controlStatus' | 'phase' | 'mode' | 'manuallyDisconnected'>) {
  const status = portalStatusPresentation(input);
  const tone = status.busy ? 'searching' : input.mode === 'demo' ? 'demo' : input.connection === 'connected' ? input.controlStatus === 'carPresent' ? 'onPortal' : 'connected' : 'demo';
  const label = input.connection === 'connected' && input.mode === 'demo' ? 'DEMO MODE'
    : status.busy && input.phase === 'scanning' ? 'SEARCHING'
    : input.connection === 'connected' && input.controlStatus !== 'transitional' && input.mode !== 'demo' ? input.controlStatus === 'carPresent' ? 'ON PORTAL' : 'PORTAL LIVE'
    : status.label.toUpperCase();
  return { tone, label, error: status.tone === 'error', hollow: status.busy } as const;
}

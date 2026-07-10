import type {
  BleLogEntry,
  BlePhase,
  BlePortalCallbacks,
  PortalTransport,
} from "../ble/types";

export type PortalMode = "live" | "demo";

interface ControllerTransport extends PortalTransport {
  triggerPass?: (scaleMph?: number) => void;
}

export interface PortalControllerState {
  readonly ready: boolean;
  readonly canBle: boolean;
  readonly mode: PortalMode;
  readonly phase: BlePhase | null;
  readonly logs: readonly BleLogEntry[];
  readonly manuallyDisconnected: boolean;
}

export interface PortalControllerDependencies {
  readonly canBle: boolean;
  readonly createBle: (callbacks: Pick<BlePortalCallbacks, "onPhase" | "onLog">) => ControllerTransport;
  readonly createMock: () => ControllerTransport;
  readonly persistDemoDefault: (enabled: boolean) => void;
  readonly prewarmLive?: () => void;
  readonly maxLogs?: number;
}

type Listener = () => void;

/**
 * Application-lifetime owner for the one active portal transport. The class has
 * no React or native dependencies, so lifecycle handoffs are covered with fakes.
 */
export class PortalController {
  private readonly listeners = new Set<Listener>();
  private readonly maxLogs: number;
  private state: PortalControllerState;
  private transport: ControllerTransport | null = null;
  private generation = 0;
  private destroyed = false;
  private operation: Promise<void> = Promise.resolve();

  constructor(private readonly dependencies: PortalControllerDependencies) {
    this.maxLogs = dependencies.maxLogs ?? 100;
    this.state = {
      ready: false,
      canBle: dependencies.canBle,
      mode: "demo",
      phase: null,
      logs: [],
      manuallyDisconnected: false,
    };
  }

  getState = (): PortalControllerState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  configure = (mockModeDefault: boolean): Promise<void> =>
    this.enqueue(async () => {
      if (this.destroyed || this.state.ready) return;
      if (this.dependencies.canBle) this.dependencies.prewarmLive?.();
      const mode: PortalMode = this.dependencies.canBle && !mockModeDefault ? "live" : "demo";
      this.update({ ready: true, mode, manuallyDisconnected: false });
      await this.replaceTransport(mode);
    });

  connect = (): Promise<void> =>
    this.enqueue(async () => {
      if (this.destroyed || !this.state.ready) return;
      this.update({ manuallyDisconnected: false });
      if (!this.transport) this.transport = this.createTransport(this.state.mode);
      await this.transport.start();
    });

  retry = (): Promise<void> =>
    this.enqueue(async () => {
      if (this.destroyed || !this.state.ready) return;
      this.update({ manuallyDisconnected: false, logs: [] });
      if (!this.transport) {
        this.transport = this.createTransport(this.state.mode);
      } else {
        await this.transport.stop();
      }
      await this.transport.start();
    });

  disconnect = (): Promise<void> =>
    this.enqueue(async () => {
      if (this.destroyed || !this.state.ready) return;
      this.update({ manuallyDisconnected: true });
      await this.transport?.stop();
    });

  setMode = (requested: PortalMode): Promise<void> =>
    this.enqueue(async () => {
      if (this.destroyed || !this.state.ready) return;
      const mode: PortalMode = this.dependencies.canBle ? requested : "demo";
      if (this.dependencies.canBle) this.dependencies.persistDemoDefault(mode === "demo");
      if (mode === this.state.mode) {
        if (this.state.manuallyDisconnected) {
          this.update({ manuallyDisconnected: false });
          await this.transport?.start();
        }
        return;
      }
      this.update({ mode, manuallyDisconnected: false, phase: null, logs: [] });
      await this.replaceTransport(mode);
    });

  triggerDemoPass = (scaleMph?: number): void => {
    if (this.state.mode === "demo") this.transport?.triggerPass?.(scaleMph);
  };

  clearLogs = (): void => this.update({ logs: [] });

  destroy = (): Promise<void> =>
    this.enqueue(async () => {
      if (this.destroyed) return;
      this.destroyed = true;
      this.generation += 1;
      await this.transport?.stop();
      this.transport = null;
      this.listeners.clear();
    });

  private async replaceTransport(mode: PortalMode): Promise<void> {
    this.generation += 1;
    await this.transport?.stop();
    if (this.destroyed) return;
    this.transport = this.createTransport(mode);
    await this.transport.start();
  }

  private createTransport(mode: PortalMode): ControllerTransport {
    const generation = ++this.generation;
    if (mode === "demo") {
      this.update({ phase: null });
      return this.dependencies.createMock();
    }

    return this.dependencies.createBle({
      onPhase: (phase) => {
        if (generation === this.generation && !this.destroyed) this.update({ phase });
      },
      onLog: (entry) => {
        if (generation !== this.generation || this.destroyed) return;
        this.update({ logs: [entry, ...this.state.logs].slice(0, this.maxLogs) });
      },
    });
  }

  private enqueue(action: () => Promise<void>): Promise<void> {
    const next = this.operation.then(action, action);
    this.operation = next.catch(() => {});
    return next;
  }

  private update(patch: Partial<PortalControllerState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
}

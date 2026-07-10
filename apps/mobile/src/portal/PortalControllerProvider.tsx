import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import * as Device from "expo-device";

import { createBlePortal, isBleAvailable, prewarmBle } from "../ble/blePortal";
import { createMockPortal } from "../mock/mockPortal";
import { usePortalStore } from "../store/portalStore";
import { useSettingsStore } from "../store/settingsStore";
import {
  PortalController,
  type PortalControllerState,
  type PortalMode,
} from "./controller";

const PortalControllerContext = createContext<PortalController | null>(null);

export function PortalControllerProvider({ children }: { children: ReactNode }) {
  const settingsHydrated = useSettingsStore((state) => state.hydrated);
  const mockModeDefault = useSettingsStore((state) => state.mockModeDefault);
  const controllerRef = useRef<PortalController | null>(null);

  if (!controllerRef.current) {
    const canBle = isBleAvailable() && Device.isDevice;
    controllerRef.current = new PortalController({
      canBle,
      createBle: ({ onPhase, onLog }) => {
        const { dispatch, setConnection } = usePortalStore.getState();
        return createBlePortal({ dispatch, setConnection, onPhase, onLog });
      },
      createMock: () => {
        const { dispatch, setConnection } = usePortalStore.getState();
        return createMockPortal({ dispatch, setConnection });
      },
      persistDemoDefault: (enabled) => useSettingsStore.getState().setMockModeDefault(enabled),
      prewarmLive: prewarmBle,
    });
  }

  useEffect(() => {
    if (settingsHydrated) void controllerRef.current?.configure(mockModeDefault);
  }, [settingsHydrated, mockModeDefault]);

  useEffect(
    () => () => {
      void controllerRef.current?.destroy();
    },
    [],
  );

  return (
    <PortalControllerContext.Provider value={controllerRef.current}>
      {children}
    </PortalControllerContext.Provider>
  );
}

function useController(): PortalController {
  const controller = useContext(PortalControllerContext);
  if (!controller) throw new Error("Portal controller is not mounted");
  return controller;
}

export function usePortalController<T>(selector: (state: PortalControllerState) => T): T {
  const controller = useController();
  return useSyncExternalStore(
    controller.subscribe,
    () => selector(controller.getState()),
    () => selector(controller.getState()),
  );
}

export interface PortalControllerActions {
  readonly connect: () => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
  readonly setMode: (mode: PortalMode) => Promise<void>;
  readonly triggerDemoPass: (scaleMph?: number) => void;
  readonly clearLogs: () => void;
}

export function usePortalControllerActions(): PortalControllerActions {
  const controller = useController();
  return {
    connect: controller.connect,
    retry: controller.retry,
    disconnect: controller.disconnect,
    setMode: controller.setMode,
    triggerDemoPass: controller.triggerDemoPass,
    clearLogs: controller.clearLogs,
  };
}

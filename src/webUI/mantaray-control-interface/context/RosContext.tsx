import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { rosService } from '../services/rosService';

interface LogEntry {
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
}

interface PowerLimitMsg {
  forward: number;
  rightward: number;
  upward: number;
  roll: number;
  pitch: number;
  yaw: number;
}

interface PowerPreset {
  label: string;
  value: number;
}

interface EulerAngles {
  roll: number;
  pitch: number;
  yaw: number;
}

export type AxisKey = keyof PowerLimitMsg;

export type PresetsRecord = {
  global: PowerPreset[];
  forward: PowerPreset[];
  rightward: PowerPreset[];
  upward: PowerPreset[];
  roll: PowerPreset[];
  pitch: PowerPreset[];
  yaw: PowerPreset[];
};

interface RosAppContextType {
  isConnected: boolean;
  targetHost: string;
  recentHosts: string[];
  logs: LogEntry[];
  pidOn: boolean;
  powerLimit: PowerLimitMsg;
  depthBaseline: number;
  powerPresets: PresetsRecord;
  updateTargetHost: (host: string) => void;
  addLog: (type: 'info' | 'warn' | 'error' | 'success', message: string) => void;
  togglePid: (status: boolean) => void;
  calibrateDepthBaseline: () => void;
  setPowerLimit: (powerLimit: PowerLimitMsg) => void;
  updatePowerPresets: (presets: PresetsRecord) => void;
}

interface RosTelemetryContextType {
  eulerAngles: EulerAngles;
  depthRaw: number;
  depthCalculatedCm: number;
}

const RosAppContext = createContext<RosAppContextType | undefined>(undefined);
const RosTelemetryContext = createContext<RosTelemetryContextType | undefined>(undefined);

const DEFAULT_PRESET_ARRAY: PowerPreset[] = [
  { label: 'LOW', value: 0.3 },
  { label: 'MED', value: 0.5 },
  { label: 'HIGH', value: 0.7 },
  { label: 'MAX', value: 1.0 },
];

const DEFAULT_PRESETS_RECORD: PresetsRecord = {
  global: [...DEFAULT_PRESET_ARRAY],
  forward: [...DEFAULT_PRESET_ARRAY],
  rightward: [...DEFAULT_PRESET_ARRAY],
  upward: [...DEFAULT_PRESET_ARRAY],
  roll: [...DEFAULT_PRESET_ARRAY],
  pitch: [...DEFAULT_PRESET_ARRAY],
  yaw: [...DEFAULT_PRESET_ARRAY],
};

const DEFAULT_DEPTH_BASELINE = 20214;

export const RosProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [targetHost, setTargetHost] = useState(rosService.getTargetHost());
  const [recentHosts, setRecentHosts] = useState(rosService.getRecentHosts());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pidOn, setPidOn] = useState(true);
  const [powerLimit, setPowerLimitState] = useState<PowerLimitMsg>({
    forward: 0.5,
    rightward: 0.5,
    upward: 0.5,
    roll: 0.5,
    pitch: 0.5,
    yaw: 0.5,
  });
  const [eulerAngles, setEulerAngles] = useState<EulerAngles>({
    roll: 0,
    pitch: 0,
    yaw: 0,
  });
  const [depthRaw, setDepthRaw] = useState(0);
  const [depthBaseline, setDepthBaseline] = useState<number>(DEFAULT_DEPTH_BASELINE);
  const [powerPresets, setPowerPresetsState] = useState<PresetsRecord>(() => {
    const stored = localStorage.getItem('power_presets');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // migrate from old single-array format
          return {
            global: parsed,
            forward: [...parsed],
            rightward: [...parsed],
            upward: [...parsed],
            roll: [...parsed],
            pitch: [...parsed],
            yaw: [...parsed],
          };
        }
        return { ...DEFAULT_PRESETS_RECORD, ...parsed };
      } catch (e) {
        return DEFAULT_PRESETS_RECORD;
      }
    }
    return DEFAULT_PRESETS_RECORD;
  });

  useEffect(() => {
    const unsubStatus = rosService.subscribeStatus((connected) => {
      setIsConnected(connected);
      setTargetHost(rosService.getTargetHost());
      setRecentHosts(rosService.getRecentHosts());
    });

    const unsubLogs = rosService.subscribeLogs((newLog) => {
      setLogs(prev => [...prev.slice(-49), newLog]); // Keep last 50 logs
    });

    const unsubPid = rosService.subscribePid(setPidOn);

    const unsubPowerLimit = rosService.subscribePowerLimit((receivedPowerLimit) => {
      setPowerLimitState(receivedPowerLimit);
    });

    const unsubEuler = rosService.subscribeEuler((receivedEuler) => {
      setEulerAngles(receivedEuler);
    });

    const unsubDepth = rosService.subscribeDepth((receivedDepthRaw) => {
      setDepthRaw(receivedDepthRaw);
    });

    return () => {
      unsubStatus();
      unsubLogs();
      unsubPid();
      unsubPowerLimit();
      unsubEuler();
      unsubDepth();
    };
  }, []);

  const updateTargetHost = useCallback((host: string) => {
    rosService.updateTargetHost(host);
    setTargetHost(rosService.getTargetHost());
    setRecentHosts(rosService.getRecentHosts());
  }, []);

  const addLog = useCallback((type: 'info' | 'warn' | 'error' | 'success', message: string) => {
    rosService.addLog(type, message);
  }, []);

  const togglePid = useCallback((status: boolean) => {
    rosService.publishPidToggle(status);
  }, []);

  const calibrateDepthBaseline = useCallback(() => {
    const nextBaseline = depthRaw;
    if (!Number.isFinite(nextBaseline)) {
      rosService.addLog('warn', 'Depth baseline calibration failed: invalid depth sample');
      return;
    }
    setDepthBaseline(nextBaseline);
    rosService.addLog('success', `Depth baseline calibrated at ${nextBaseline.toFixed(2)}`);
  }, [depthRaw]);

  const setPowerLimit = useCallback((newPowerLimit: PowerLimitMsg) => {
    setPowerLimitState(newPowerLimit);
    rosService.publishPowerLimit(newPowerLimit);
  }, []);

  const updatePowerPresets = useCallback((newPresets: PresetsRecord) => {
    setPowerPresetsState(newPresets);
    localStorage.setItem('power_presets', JSON.stringify(newPresets));
  }, []);

  const depthCalculatedCm = Number.isFinite(depthRaw)
    ? (depthRaw - depthBaseline) / 16.8269
    : 0;

  const appValue = useMemo<RosAppContextType>(
    () => ({
      isConnected,
      targetHost,
      recentHosts,
      logs,
      pidOn,
      powerLimit,
      depthBaseline,
      powerPresets,
      updateTargetHost,
      addLog,
      togglePid,
      calibrateDepthBaseline,
      setPowerLimit,
      updatePowerPresets,
    }),
    [
      isConnected,
      targetHost,
      recentHosts,
      logs,
      pidOn,
      powerLimit,
      depthBaseline,
      powerPresets,
      updateTargetHost,
      addLog,
      togglePid,
      calibrateDepthBaseline,
      setPowerLimit,
      updatePowerPresets,
    ]
  );

  const telemetryValue = useMemo<RosTelemetryContextType>(
    () => ({
      eulerAngles,
      depthRaw,
      depthCalculatedCm,
    }),
    [eulerAngles, depthRaw, depthCalculatedCm]
  );

  return (
    <RosAppContext.Provider value={appValue}>
      <RosTelemetryContext.Provider value={telemetryValue}>
        {children}
      </RosTelemetryContext.Provider>
    </RosAppContext.Provider>
  );
};

export const useRosApp = () => {
  const context = useContext(RosAppContext);
  if (context === undefined) {
    throw new Error('useRosApp must be used within a RosProvider');
  }
  return context;
};

export const useRosTelemetry = () => {
  const context = useContext(RosTelemetryContext);
  if (context === undefined) {
    throw new Error('useRosTelemetry must be used within a RosProvider');
  }
  return context;
};

export const useRos = () => {
  const app = useRosApp();
  const telemetry = useRosTelemetry();
  return { ...app, ...telemetry };
};

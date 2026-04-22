import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

interface RosContextType {
  isConnected: boolean;
  targetHost: string;
  recentHosts: string[];
  logs: LogEntry[];
  pidOn: boolean;
  powerLimit: PowerLimitMsg;
  eulerAngles: EulerAngles;
  depthRaw: number;
  depthCalculatedCm: number;
  powerPresets: PresetsRecord;
  updateTargetHost: (host: string) => void;
  addLog: (type: 'info' | 'warn' | 'error' | 'success', message: string) => void;
  togglePid: (status: boolean) => void;
  setPowerLimit: (powerLimit: PowerLimitMsg) => void;
  updatePowerPresets: (presets: PresetsRecord) => void;
}

const RosContext = createContext<RosContextType | undefined>(undefined);

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
  const [depthCalculatedCm, setDepthCalculatedCm] = useState(0);
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
      if (Number.isFinite(receivedDepthRaw)) {
        const calculated = (receivedDepthRaw - 20214) / 16.8269;
        setDepthCalculatedCm(calculated);
      } else {
        setDepthCalculatedCm(0);
      }
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

  const updateTargetHost = (host: string) => {
    rosService.updateTargetHost(host);
    setTargetHost(rosService.getTargetHost());
    setRecentHosts(rosService.getRecentHosts());
  };

  const addLog = (type: 'info' | 'warn' | 'error' | 'success', message: string) => {
    rosService.addLog(type, message);
  };

  const togglePid = (status: boolean) => {
    rosService.publishPidToggle(status);
  };

  const setPowerLimit = (newPowerLimit: PowerLimitMsg) => {
    setPowerLimitState(newPowerLimit);
    rosService.publishPowerLimit(newPowerLimit);
  };

  const updatePowerPresets = (newPresets: PresetsRecord) => {
    setPowerPresetsState(newPresets);
    localStorage.setItem('power_presets', JSON.stringify(newPresets));
  };

  return (
    <RosContext.Provider value={{ isConnected, targetHost, recentHosts, logs, pidOn, powerLimit, eulerAngles, depthRaw, depthCalculatedCm, powerPresets, updateTargetHost, addLog, togglePid, setPowerLimit, updatePowerPresets }}>
      {children}
    </RosContext.Provider>
  );
};

export const useRos = () => {
  const context = useContext(RosContext);
  if (context === undefined) {
    throw new Error('useRos must be used within a RosProvider');
  }
  return context;
};

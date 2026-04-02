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

interface RosContextType {
  isConnected: boolean;
  targetHost: string;
  recentHosts: string[];
  logs: LogEntry[];
  pidOn: boolean;
  powerLimit: PowerLimitMsg;
  powerPresets: PowerPreset[];
  updateTargetHost: (host: string) => void;
  addLog: (type: 'info' | 'warn' | 'error' | 'success', message: string) => void;
  togglePid: (status: boolean) => void;
  setPowerLimit: (powerLimit: PowerLimitMsg) => void;
  updatePowerPresets: (presets: PowerPreset[]) => void;
}

const RosContext = createContext<RosContextType | undefined>(undefined);

const DEFAULT_PRESETS: PowerPreset[] = [
  { label: 'LOW', value: 0.3 },
  { label: 'MED', value: 0.5 },
  { label: 'HIGH', value: 0.7 },
  { label: 'MAX', value: 1.0 },
];

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
  const [powerPresets, setPowerPresetsState] = useState<PowerPreset[]>(() => {
    const stored = localStorage.getItem('power_presets');
    return stored ? JSON.parse(stored) : DEFAULT_PRESETS;
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

    return () => {
      unsubStatus();
      unsubLogs();
      unsubPid();
      unsubPowerLimit();
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

  const updatePowerPresets = (newPresets: PowerPreset[]) => {
    setPowerPresetsState(newPresets);
    localStorage.setItem('power_presets', JSON.stringify(newPresets));
  };

  return (
    <RosContext.Provider value={{ isConnected, targetHost, recentHosts, logs, pidOn, powerLimit, powerPresets, updateTargetHost, addLog, togglePid, setPowerLimit, updatePowerPresets }}>
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

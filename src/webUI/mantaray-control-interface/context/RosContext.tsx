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

interface RosContextType {
  isConnected: boolean;
  targetHost: string;
  recentHosts: string[];
  logs: LogEntry[];
  pidOn: boolean;
  powerLimit: PowerLimitMsg;
  updateTargetHost: (host: string) => void;
  addLog: (type: 'info' | 'warn' | 'error' | 'success', message: string) => void;
  togglePid: (status: boolean) => void;
  setPowerLimit: (powerLimit: PowerLimitMsg) => void;
}

const RosContext = createContext<RosContextType | undefined>(undefined);

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

  return (
    <RosContext.Provider value={{ isConnected, targetHost, recentHosts, logs, pidOn, powerLimit, updateTargetHost, addLog, togglePid, setPowerLimit }}>
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

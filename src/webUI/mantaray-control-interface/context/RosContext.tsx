import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { rosService } from '../services/rosService';
import type { PowerAxisKey, PinnedPowerLimit } from '../types';

interface LogEntry {
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
}

interface RosContextType {
  isConnected: boolean;
  targetHost: string;
  recentHosts: string[];
  logs: LogEntry[];
  pidOn: boolean;
  pinnedLimits: Partial<Record<PowerAxisKey, PinnedPowerLimit>>;
  updateTargetHost: (host: string) => void;
  addLog: (type: 'info' | 'warn' | 'error' | 'success', message: string) => void;
  togglePid: (status: boolean) => void;
  setPinnedLimit: (axis: PowerAxisKey, data: PinnedPowerLimit | null) => void;
}

const RosContext = createContext<RosContextType | undefined>(undefined);

export const RosProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [targetHost, setTargetHost] = useState(rosService.getTargetHost());
  const [recentHosts, setRecentHosts] = useState(rosService.getRecentHosts());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pidOn, setPidOn] = useState(true);
  const [pinnedLimits, setPinnedLimitsState] = useState<Partial<Record<PowerAxisKey, PinnedPowerLimit>>>(() => {
    try {
      const stored = localStorage.getItem('mantaray_pinned_limits');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const setPinnedLimit = (axis: PowerAxisKey, data: PinnedPowerLimit | null) => {
    setPinnedLimitsState((prev) => {
      const next = { ...prev };
      if (data === null) delete next[axis];
      else next[axis] = data;
      localStorage.setItem('mantaray_pinned_limits', JSON.stringify(next));
      return next;
    });
  };

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

    return () => {
      unsubStatus();
      unsubLogs();
      unsubPid();
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

  return (
    <RosContext.Provider value={{ isConnected, targetHost, recentHosts, logs, pidOn, pinnedLimits, updateTargetHost, addLog, togglePid, setPinnedLimit }}>
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

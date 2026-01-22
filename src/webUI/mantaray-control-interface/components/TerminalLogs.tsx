import React, { useState, useEffect, useRef } from 'react';
import { rosService } from '../services/rosService';

interface LogEntry {
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
}

export const TerminalLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = rosService.subscribeLogs((newLog) => {
      setLogs(prev => [...prev.slice(-24), newLog]); // Keep last 25 logs
    });
    return () => unsub();
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-k3s-block border-2 border-k3s-border p-3 font-mono text-[10px] h-[150px] flex-none overflow-hidden flex flex-col">
      <div className="flex items-center gap-2 mb-2 border-b border-k3s-border pb-1">
        <span className="text-k3s-primary uppercase font-bold">TERMINAL_LOG:</span>
        <span className="text-k3s-muted italic">System sequence active</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
        {logs.length === 0 ? (
          <div className="text-k3s-muted animate-pulse">_ Waiting for system events...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2 text-[9px]">
              <span className="text-gray-500">[{log.timestamp}]</span>
              <span className={
                log.type === 'error' ? 'text-red-400' :
                log.type === 'warn' ? 'text-yellow-400' :
                log.type === 'success' ? 'text-green-400' :
                'text-k3s-muted'
              }>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};

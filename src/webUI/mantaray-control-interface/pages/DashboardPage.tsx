import React from 'react';
import { StreamView } from '../components/StreamView';
import { TerminalLogs } from '../components/TerminalLogs';
import { ControlPanel } from '../components/ControlPanel';

interface Stream {
  id: string;
  title: string;
  url: string;
}

interface DashboardPageProps {
  streams: Stream[];
  handleUrlChange: (id: string, newUrl: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ streams, handleUrlChange }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
      {/* Horizontal Video Feeds Section */}
      <div className="lg:col-span-9 flex flex-col gap-4 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
          {streams.map((stream) => (
            <div key={stream.id} className="min-h-0">
              <StreamView 
                {...stream} 
                onUrlChange={handleUrlChange}
              />
            </div>
          ))}
        </div>
        
        {/* Extended Telemetry/Logs Area */}
        <TerminalLogs />
      </div>

      {/* Sidebar Controls */}
      <div className="lg:col-span-3 h-full min-h-0 overflow-hidden">
        <ControlPanel />
      </div>
    </div>
  );
};

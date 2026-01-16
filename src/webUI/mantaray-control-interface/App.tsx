import React, { useState } from 'react';
import { Header } from './components/Header';
import { StreamView } from './components/StreamView';
import { ControlPanel } from './components/ControlPanel';

const App: React.FC = () => {
  // Real endpoints from provided HTML/C++ reference
  // Using /stream for multipart/x-mixed-replace support
  const [streams, setStreams] = useState([
    {
      id: 'rov-feed',
      title: 'ROV Camera Feed',
      url: 'http://rov:30001/stream'
    },
    {
      id: 'rov-cam-feed',
      title: 'ROV-CAM Camera Feed',
      url: 'http://rov-cam:30002/stream'
    }
  ]);

  const handleUrlChange = (id: string, newUrl: string) => {
    setStreams(prev => prev.map(s => s.id === id ? { ...s, url: newUrl } : s));
  };

  return (
    <div className="min-h-screen bg-k3s-dark text-k3s-text font-sans selection:bg-k3s-primary selection:text-black">
      <Header />
      
      <main className="p-4 md:p-6 max-w-[1920px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Horizontal Video Feeds Section */}
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
            <div className="h-full min-h-[400px]">
              <StreamView 
                {...streams[0]} 
                onUrlChange={handleUrlChange}
              />
            </div>
            <div className="h-full min-h-[400px]">
              <StreamView 
                {...streams[1]} 
                onUrlChange={handleUrlChange}
              />
            </div>
            
            {/* Extended Telemetry/Logs Area */}
            <div className="md:col-span-2 bg-k3s-block border-2 border-k3s-border p-3 font-mono text-xs text-k3s-muted">
              <div className="flex gap-4">
                <span className="text-k3s-primary uppercase font-bold">TERMINAL_LOG:</span>
                <span className="animate-pulse">_ System Active. Waiting for inputs...</span>
              </div>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="lg:col-span-3">
            <ControlPanel />
          </div>
          
        </div>
      </main>
    </div>
  );
};

export default App;
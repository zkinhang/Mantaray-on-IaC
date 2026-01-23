import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Activity, Settings, LayoutDashboard } from 'lucide-react';
import { StreamView } from './components/StreamView';
import { ControlPanel } from './components/ControlPanel';
import { TerminalLogs } from './components/TerminalLogs';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Real endpoints from provided HTML/C++ reference
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

  const handleUrlChange = useCallback((id: string, newUrl: string) => {
    setStreams(prev => prev.map(s => s.id === id ? { ...s, url: newUrl } : s));
  }, []);

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            {/* Horizontal Video Feeds Section */}
            <div className="lg:col-span-9 flex flex-col gap-4 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
                <div className="min-h-0">
                  <StreamView 
                    {...streams[0]} 
                    onUrlChange={handleUrlChange}
                  />
                </div>
                <div className="min-h-0">
                  <StreamView 
                    {...streams[1]} 
                    onUrlChange={handleUrlChange}
                  />
                </div>
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
      case 'telemetry':
        return (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-k3s-border rounded-lg bg-k3s-block">
            <div className="text-center">
              <div className="w-16 h-16 bg-k3s-dark rounded-full flex items-center justify-center mx-auto mb-4 border border-k3s-primary/50 text-k3s-primary">
                <Activity size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">Telemetry View</h2>
              <p className="text-k3s-muted italic">Advanced telemetry metrics coming soon...</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="h-full flex items-center justify-center border-2 border-dashed border-k3s-border rounded-lg bg-k3s-block">
            <div className="text-center">
              <div className="w-16 h-16 bg-k3s-dark rounded-full flex items-center justify-center mx-auto mb-4 border border-k3s-primary/50 text-k3s-primary">
                <Settings size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white">System Settings</h2>
              <p className="text-k3s-muted italic">Robot configuration and parameters coming soon...</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-k3s-dark text-k3s-text font-sans selection:bg-k3s-primary selection:text-black flex flex-col overflow-hidden">
      <Header onMenuClick={() => setIsNavOpen(true)} />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Navigation 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
        />
        
        <main className="flex-1 p-2 md:p-4 max-w-[1920px] mx-auto w-full overflow-hidden transition-all duration-300">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
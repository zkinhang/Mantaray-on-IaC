import React, { useEffect, useState, useRef, memo } from 'react';
import { Wifi, WifiOff, Server, Anchor, ChevronDown, History } from 'lucide-react';
import { rosService } from '../services/rosService';

export const Header: React.FC = memo(() => {
  const [isConnected, setIsConnected] = useState(false);
  const [targetHost, setTargetHost] = useState(rosService.getTargetHost());
  const [recentHosts, setRecentHosts] = useState(rosService.getRecentHosts());
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = rosService.subscribeStatus(setIsConnected);
    
    // Close dropdown on click outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleHostUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    rosService.updateTargetHost(targetHost);
    setRecentHosts(rosService.getRecentHosts());
    setShowDropdown(false);
  };

  const handleRecentClick = (host: string) => {
    setTargetHost(host);
    rosService.updateTargetHost(host);
    setRecentHosts(rosService.getRecentHosts());
    setShowDropdown(false);
  };

  return (
    <header className="h-16 bg-k3s-block border-b-2 border-k3s-primary flex items-center justify-between px-6 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center space-x-4">
        <div className="bg-k3s-primary p-2 shadow-lg">
          <Anchor className="w-6 h-6 text-black" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-none tracking-tight">Mantaray<span className="text-k3s-primary">.IaC</span></h1>
          <p className="text-[8px] text-gray-400 uppercase tracking-[0.2em] font-bold mt-1">Robotic Infrastructure Control</p>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="hidden lg:flex items-center space-x-2 relative" ref={dropdownRef}>
          <form onSubmit={handleHostUpdate} className="flex items-center space-x-2">
            <div className="flex items-center bg-k3s-dark border border-k3s-border px-3 py-1 relative">
              <Server className={`w-3.5 h-3.5 mr-2 ${isConnected ? 'text-green-500' : 'text-gray-500'}`} />
              <span className="text-[10px] text-k3s-muted font-mono mr-2">HOST:</span>
              <input 
                type="text" 
                value={targetHost}
                onChange={(e) => setTargetHost(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                className="bg-transparent text-xs font-mono text-white outline-none w-32"
                placeholder="127.0.0.1"
              />
              {recentHosts.length > 0 ? (
                <button 
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="ml-1 hover:text-k3s-primary transition-colors"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                </button>
              ) : null}

              {/* Dropdown Menu */}
              {showDropdown && recentHosts.length > 0 ? (
                <div className="absolute top-full left-0 right-0 mt-1 bg-k3s-block border-2 border-k3s-primary z-[100] shadow-2xl animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 border-b border-k3s-border flex items-center">
                    <History className="w-3 h-3 text-k3s-muted mr-1.5" />
                    <span className="text-[9px] text-k3s-muted font-bold uppercase tracking-wider">Recent Connections</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {recentHosts.map((host) => (
                      <button
                        key={host}
                        onClick={() => handleRecentClick(host)}
                        className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-k3s-primary hover:text-black transition-colors flex items-center justify-between group"
                      >
                        <span>{host}</span>
                        {host === targetHost ? <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <button 
              type="submit"
              className="px-3 py-1 bg-k3s-primary text-black text-[10px] font-bold uppercase hover:bg-white transition-colors h-[30px]"
            >
              Connect
            </button>
          </form>
        </div>

        <div className={`flex items-center justify-center space-x-3 w-44 h-[38px] font-bold uppercase text-xs tracking-wide transition-colors ${
          isConnected 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="w-24 text-center">
            {isConnected ? 'Bridge Active' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
});
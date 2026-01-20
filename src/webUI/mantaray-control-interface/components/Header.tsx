import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Server, Anchor } from 'lucide-react';
import { rosService } from '../services/rosService';

export const Header: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = rosService.subscribeStatus(setIsConnected);
    return () => unsubscribe();
  }, []);

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

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center px-4 py-2 bg-k3s-dark border border-k3s-border text-gray-300 text-xs font-mono">
          <Server className="w-4 h-4 mr-2 text-green-500" />
          <span className="text-green-500 font-bold">MODE: LIVE CONTROL</span>
        </div>
        
        <div className={`flex items-center space-x-3 px-5 py-2 font-bold uppercase text-xs tracking-wide transition-colors ${
          isConnected 
            ? 'bg-green-600 text-white' 
            : 'bg-red-600 text-white'
        }`}>
          {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span>
            {isConnected ? 'Bridge Active' : 'Offline'}
          </span>
        </div>
      </div>
    </header>
  );
};
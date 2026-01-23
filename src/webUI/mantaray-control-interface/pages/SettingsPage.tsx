import React from 'react';
import { Settings } from 'lucide-react';

export const SettingsPage: React.FC = () => {
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
};

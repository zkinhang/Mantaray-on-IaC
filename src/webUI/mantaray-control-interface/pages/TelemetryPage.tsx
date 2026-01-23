import React from 'react';
import { Activity } from 'lucide-react';

export const TelemetryPage: React.FC = () => {
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
};

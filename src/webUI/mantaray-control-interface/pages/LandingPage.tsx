import React from 'react';
import { Activity, Settings, LayoutDashboard, MapPinned } from 'lucide-react';

interface LandingPageProps {
  onPageChange: (id: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onPageChange }) => {
  const modules = [
    { 
      id: 'dashboard', 
      label: 'Primary Dashboard (for pilot team)', 
      icon: LayoutDashboard,
      details: 'Real-time Video & Flight Controls'
    },
    { 
      id: 'telemetry', 
      label: 'Advanced Telemetry', 
      icon: Activity,
      details: 'Sensory Diagnostics & Environment'
    },
    { 
      id: 'settings', 
      label: 'System Configuration', 
      icon: Settings,
      details: 'Hardware Parameters & Network'
    },
    {
      id: 'syncmap',
      label: 'Causality: One-Veneration Configurator (Mapping)',
      icon: MapPinned,
      details: 'mapping configuration, enjoy'
    }
  ];

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pr-1 animate-in fade-in zoom-in-95 duration-700 relative">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#FFC61C 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        <div className="space-y-3 text-center max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase font-mono leading-none">
            ROBOT <span className="text-k3s-primary">CONTROL</span>
          </h2>
        </div>
        
        <div className="flex flex-col space-y-2 max-w-3xl mx-auto w-full">
          {modules.map((item, idx) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              style={{ animationDelay: `${(idx + 1) * 75}ms` }}
              className="group relative flex items-center bg-k3s-block/40 border-l border-r border-k3s-border/30 p-3 md:p-5 hover:bg-k3s-primary/5 hover:border-k3s-primary/30 transition-all duration-300 animate-in slide-in-from-left-4 fade-in"
            >
              {/* Active Accent */}
              <div className="absolute left-0 top-0 bottom-0 w-0 bg-k3s-primary group-hover:w-1 transition-all duration-300" />
              
              <div className="mr-4 md:mr-6 p-2.5 md:p-3 bg-k3s-dark border border-k3s-border text-k3s-muted group-hover:text-k3s-primary group-hover:border-k3s-primary/50 transition-all duration-300">
                <item.icon size={20} />
              </div>
              
              <div className="flex-1 text-left">
                <h3 className="font-bold text-white group-hover:text-k3s-primary transition-colors uppercase tracking-widest font-mono text-sm md:text-base">
                  {item.label}
                </h3>
                <p className="text-[10px] text-k3s-muted font-mono opacity-60 uppercase tracking-tighter mt-0.5">{item.details}</p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 flex items-center justify-center text-k3s-muted group-hover:text-k3s-primary transition-all group-hover:translate-x-1">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 5L12 10L7 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square"/>
                  </svg>
                </div>
              </div>
              
              {/* Bottom Border Accent */}
              <div className="absolute bottom-0 left-4 right-4 h-px bg-k3s-border/10" />
            </button>
          ))}

          {/* Extended Footer for List */}
          <div className="flex items-center justify-center py-4 border-t border-dashed border-k3s-border/30 opacity-20">
          </div>
        </div>
      </div>
    </div>
  );
};

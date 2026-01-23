import React from 'react';
import { LayoutDashboard, Activity, Settings, X, Home } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange, isOpen, onClose }) => {
  const navItems = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'telemetry', label: 'Telemetry', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <nav 
        className={`fixed left-0 top-0 bottom-0 z-50 bg-k3s-block border-r border-k3s-border transition-transform duration-300 ease-in-out flex flex-col w-64 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-k3s-border">
          <span className="font-bold text-k3s-primary">MENU</span>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-k3s-dark rounded-md text-k3s-muted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 py-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onPageChange(item.id);
                onClose();
              }}
              className={`w-full flex items-center px-6 py-4 transition-colors hover:bg-k3s-dark group relative ${
                currentPage === item.id ? 'text-k3s-primary' : 'text-k3s-muted'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="ml-4 text-sm font-medium">
                {item.label}
              </span>
              {currentPage === item.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-k3s-primary" />
              )}
            </button>
          ))}
        </div>
      </nav>
    </>
  );
};

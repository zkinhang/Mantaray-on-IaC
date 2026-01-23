import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Navigation } from '../components/Navigation';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPage, onPageChange }) => {
  const [isNavOpen, setIsNavOpen] = useState(false);

  return (
    <div className="h-screen bg-k3s-dark text-k3s-text font-sans selection:bg-k3s-primary selection:text-black flex flex-col overflow-hidden leading-relaxed">
      <Header 
        onMenuClick={() => setIsNavOpen(true)} 
        onLogoClick={() => onPageChange('landing')} 
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <Navigation 
          currentPage={currentPage} 
          onPageChange={onPageChange} 
          isOpen={isNavOpen}
          onClose={() => setIsNavOpen(false)}
        />
        
        <main className={`flex-1 p-2 md:p-6 max-w-[1920px] mx-auto w-full overflow-hidden transition-all duration-300 ${currentPage === 'landing' ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-k3s-block/10 via-k3s-dark to-k3s-dark' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

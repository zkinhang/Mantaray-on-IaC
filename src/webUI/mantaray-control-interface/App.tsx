import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { TelemetryPage } from './pages/TelemetryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useStreams } from './hooks/useStreams';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('landing');
  const { streams, handleUrlChange } = useStreams();

  const renderContent = () => {
    switch (currentPage) {
      case 'landing':
        return <LandingPage onPageChange={setCurrentPage} />;
      case 'dashboard':
        return <DashboardPage streams={streams} handleUrlChange={handleUrlChange} />;
      case 'telemetry':
        return <TelemetryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <LandingPage onPageChange={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderContent()}
    </Layout>
  );
};

export default App;

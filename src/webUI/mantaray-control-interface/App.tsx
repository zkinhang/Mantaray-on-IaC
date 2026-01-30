import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { TelemetryPage } from './pages/TelemetryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useStreams } from './hooks/useStreams';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(() => {
    return localStorage.getItem('mantaray_default_page') || 'landing';
  });
  const { streams, handleUrlChange } = useStreams();

  useEffect(() => {
    // If we are on landing page and there's a default set that isn't landing,
    // we should have already caught it in initialization.
    // This effect can be used for deep linking if needed later.
  }, []);
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

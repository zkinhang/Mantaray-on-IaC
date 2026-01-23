import { useState, useCallback } from 'react';

export interface Stream {
  id: string;
  title: string;
  url: string;
}

export const useStreams = () => {
  const [streams, setStreams] = useState<Stream[]>([
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

  return { streams, handleUrlChange };
};

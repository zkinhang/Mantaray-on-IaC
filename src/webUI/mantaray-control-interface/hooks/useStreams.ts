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
      url: 'ws://rov:9000?stream=rov'
    },
    {
      id: 'rov-cam-feed',
      title: 'ROV-CAM Camera Feed',
<<<<<<< Updated upstream
      url: 'ws://rov:9000?stream=rov-cam'
=======
      url: 'webrtc://local'
>>>>>>> Stashed changes
    }
  ]);

  const handleUrlChange = useCallback((id: string, newUrl: string) => {
    setStreams(prev => prev.map(s => s.id === id ? { ...s, url: newUrl } : s));
  }, []);

  return { streams, handleUrlChange };
};

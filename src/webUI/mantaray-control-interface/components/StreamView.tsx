import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { Camera, Download, RefreshCw, AlertCircle, Activity, Settings } from 'lucide-react';
import { useRos } from '../context/RosContext';
import { useWebRTC } from '../hooks/useWebRTC';

interface StreamViewProps {
  id: string;
  title: string;
  url: string;
  onUrlChange: (id: string, newUrl: string) => void;
}

export const StreamView: React.FC<StreamViewProps> = memo(({ id, title, url, onUrlChange }) => {
  const { addLog } = useRos();
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(url);
  const videoRef = useRef<HTMLVideoElement>(null);

  const { isConnected, isConnecting, errorMessage, reconnect } = useWebRTC({
    signalUrl: url,
    videoRef,
  });

  useEffect(() => {
    if (isConnected) {
      addLog('success', `STREAM [${title}]: WebRTC connected`);
      return;
    }

    if (errorMessage) {
      addLog('error', `STREAM [${title}]: ${errorMessage}`);
    }
  }, [isConnected, errorMessage, title, addLog]);

  const handleSnapshot = useCallback(() => {
    if (!videoRef.current) return;

    try {
      if (videoRef.current.videoWidth === 0 || videoRef.current.videoHeight === 0) {
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `mantaray_${id}_${new Date().toISOString()}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (e) {
      console.error("Snapshot failed:", e);
      alert("Snapshot failed. CORS headers required.");
    }
  }, [id]);

  const handleSaveUrl = useCallback(() => {
    onUrlChange(id, tempUrl);
    setIsEditing(false);
  }, [id, onUrlChange, tempUrl]);

  const handleRefresh = useCallback(() => {
    reconnect();
  }, [reconnect]);

  return (
    <div className="flex flex-col h-full bg-k3s-block border-2 border-k3s-border hover:border-k3s-primary transition-colors duration-300 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-k3s-dark border-b-2 border-k3s-border flex-none">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-k3s-primary" />
          <h3 className="font-bold text-sm tracking-wide text-white uppercase">{title}</h3>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`p-1.5 rounded transition-colors ${isEditing ? 'text-k3s-primary bg-k3s-border' : 'text-gray-400 hover:text-white'}`}
            title="Configure Stream URL"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRefresh}
            className="p-1.5 rounded transition-colors text-gray-400 hover:text-white hover:bg-k3s-border"
            title="Refresh Stream"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleSnapshot}
            className="flex items-center space-x-1 px-3 py-1.5 bg-k3s-primary hover:bg-yellow-400 text-black font-bold text-xs uppercase tracking-wider transition-transform active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>
        </div>
      </div>

      {/* URL Config */}
      {isEditing ? (
        <div className="p-3 bg-k3s-dark border-b-2 border-k3s-border flex gap-2 flex-none">
          <input 
            type="text" 
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            className="flex-1 bg-k3s-block border border-k3s-border px-3 py-1.5 text-xs text-white focus:outline-none focus:border-k3s-primary font-mono"
            placeholder="http://..."
          />
          <button 
            onClick={handleSaveUrl}
            className="px-4 py-1.5 bg-k3s-secondary hover:bg-blue-600 text-white text-xs font-bold uppercase"
          >
            Set Source
          </button>
        </div>
      ) : null}

      {/* Stream Area - WebRTC */}
      <div className="relative flex-1 bg-black flex items-center justify-center min-h-0 overflow-hidden group">
        
        {/* Loading / Error State */}
        {(!isConnected || isConnecting || Boolean(errorMessage)) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-3 bg-black z-10">
            {errorMessage ? (
              <>
                <AlertCircle className="w-10 h-10 text-red-500" />
                <span className="text-sm font-mono text-red-400">CONNECTION LOST</span>
                <div className="text-xs text-gray-600 animate-pulse">Retrying...</div>
              </>
            ) : (
              <>
                <Activity className="w-10 h-10 text-k3s-primary animate-spin" />
                <span className="text-sm font-mono text-k3s-primary">CONNECTING...</span>
              </>
            )}
          </div>
        ) : null}

        <video
          id={id === 'rov-feed' ? 'camA' : `cam-${id}`}
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Overlay Info */}
        <div className="absolute top-3 right-3 flex flex-col items-end space-y-1 z-20">
          {isConnected ? (
            <div className="flex items-center space-x-2 px-2 py-1 bg-k3s-dark/90 border border-green-500/50">
                <span className="w-2 h-2 bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-green-400 tracking-wider">LIVE</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
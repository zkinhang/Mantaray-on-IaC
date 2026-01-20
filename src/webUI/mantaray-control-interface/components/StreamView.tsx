import React, { useRef, useState, useEffect } from 'react';
import { Camera, Download, RefreshCw, AlertCircle, Activity } from 'lucide-react';
import { rosService } from '../services/rosService';

interface StreamViewProps {
  id: string;
  title: string;
  url: string;
  onUrlChange: (id: string, newUrl: string) => void;
}

export const StreamView: React.FC<StreamViewProps> = ({ id, title, url, onUrlChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempUrl, setTempUrl] = useState(url);
  const [error, setError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now());
  
  const imgRef = useRef<HTMLImageElement>(null);

  // When URL changes, reset state and timestamp
  useEffect(() => {
    setTimestamp(Date.now());
    setIsConnected(false);
    setError(false);
  }, [url]);

  const handleSnapshot = () => {
    if (!imgRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imgRef.current, 0, 0);
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
  };

  const handleSaveUrl = () => {
    onUrlChange(id, tempUrl);
    setIsEditing(false);
    setError(false);
  };

  const handleImageLoad = () => {
    if (!isConnected) {
      rosService.addLog('success', `STREAM [${title}]: Link established`);
    }
    setIsConnected(true);
    setError(false);
  };

  const handleImageError = () => {
    if (isConnected || !error) {
      rosService.addLog('error', `STREAM [${title}]: Link failure. Retrying...`);
    }
    setIsConnected(false);
    setError(true);
    
    // Retry connection after 2 seconds by updating timestamp
    setTimeout(() => {
      setTimestamp(Date.now());
    }, 2000);
  };

  const handleRefresh = () => {
    setTimestamp(Date.now());
    setIsConnected(false);
    setError(false);
  };

  // Construct stream URL with timestamp to prevent caching and force reconnects
  // Check if URL already has params to decide between ? and &
  const streamUrl = `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;

  return (
    <div className="flex flex-col h-full bg-k3s-block border-2 border-k3s-border hover:border-k3s-primary transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-k3s-dark border-b-2 border-k3s-border">
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
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRefresh}
            className="p-1.5 rounded transition-colors text-gray-400 hover:text-white hover:bg-k3s-border"
            title="Refresh Stream"
          >
            <Activity className="w-4 h-4" />
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
      {isEditing && (
        <div className="p-3 bg-k3s-dark border-b-2 border-k3s-border flex gap-2">
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
      )}

      {/* Stream Area - Native MJPEG Implementation */}
      <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] overflow-hidden group">
        
        {/* Loading / Error State */}
        {(!isConnected || error) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 space-y-3 bg-black z-10">
            {error ? (
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
        )}

        {/* 
          Native MJPEG Stream 
          Note: For multipart/x-mixed-replace, a simple img tag works.
          The browser keeps the connection open.
        */}
        <img 
          ref={imgRef}
          src={streamUrl}
          alt={`${title} Stream`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-contain transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Overlay Info */}
        <div className="absolute top-3 right-3 flex flex-col items-end space-y-1 z-20">
          {isConnected && (
            <div className="flex items-center space-x-2 px-2 py-1 bg-k3s-dark/90 border border-green-500/50">
                <span className="w-2 h-2 bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-green-400 tracking-wider">LIVE</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
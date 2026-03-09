import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import { Camera, Download, RefreshCw, AlertCircle, Activity, Settings } from 'lucide-react';
import { useRos } from '../context/RosContext';

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
  const [error, setError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now());
<<<<<<< Updated upstream

  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const connectedRef = useRef(false);
  const errorRef = useRef(false);
=======
  const [webrtcRetry, setWebrtcRetry] = useState(0);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rtcStreamRef = useRef<MediaStream | null>(null);

  const isWebRtcLocal = url.startsWith('webrtc://local');
>>>>>>> Stashed changes

  // When URL changes, reset state and timestamp
  useEffect(() => {
    setTimestamp(Date.now());
    setIsConnected(false);
    setError(false);
    connectedRef.current = false;
    errorRef.current = false;
  }, [url]);

  useEffect(() => {
    setTempUrl(url);
  }, [url]);

  useEffect(() => {
    if (!isWebRtcLocal) {
      if (rtcStreamRef.current) {
        rtcStreamRef.current.getTracks().forEach(track => track.stop());
        rtcStreamRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const connectWebRtcLocal = async () => {
      try {
        const queryString = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
        const params = new URLSearchParams(queryString);
        const deviceId = params.get('deviceId');
        const constraints: MediaStreamConstraints = {
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        rtcStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setIsConnected(true);
        setError(false);
        addLog('success', `STREAM [${title}]: WebRTC sample link established`);
      } catch (e) {
        console.error('WebRTC local sample failed:', e);
        setIsConnected(false);
        setError(true);
        addLog('error', `STREAM [${title}]: WebRTC sample failed. Check camera permission/source.`);
      }
    };

    connectWebRtcLocal();

    return () => {
      cancelled = true;
      if (rtcStreamRef.current) {
        rtcStreamRef.current.getTracks().forEach(track => track.stop());
        rtcStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isWebRtcLocal, url, title, addLog, webrtcRetry]);

  const handleSnapshot = useCallback(() => {
<<<<<<< Updated upstream
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
=======
    if (!imgRef.current && !videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      const sourceWidth = isWebRtcLocal
        ? (videoRef.current?.videoWidth || 0)
        : (imgRef.current?.naturalWidth || 0);
      const sourceHeight = isWebRtcLocal
        ? (videoRef.current?.videoHeight || 0)
        : (imgRef.current?.naturalHeight || 0);

      if (!sourceWidth || !sourceHeight) {
        return;
      }

      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isWebRtcLocal && videoRef.current) {
          ctx.drawImage(videoRef.current, 0, 0);
        } else if (imgRef.current) {
          ctx.drawImage(imgRef.current, 0, 0);
        }
>>>>>>> Stashed changes
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
  }, [id, isWebRtcLocal]);

  const handleSaveUrl = useCallback(() => {
    onUrlChange(id, tempUrl);
    setIsEditing(false);
    setError(false);
  }, [id, onUrlChange, tempUrl]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) return;
    reconnectTimerRef.current = window.setTimeout(() => {
      reconnectTimerRef.current = null;
      setTimestamp(Date.now());
    }, 2000);
  }, []);


  const handleRefresh = useCallback(() => {
    setTimestamp(Date.now());
    setIsConnected(false);
    setError(false);
<<<<<<< Updated upstream
    connectedRef.current = false;
    errorRef.current = false;
  }, []);
=======
    if (isWebRtcLocal) {
      setWebrtcRetry(prev => prev + 1);
    }
  }, [isWebRtcLocal]);
>>>>>>> Stashed changes

  useEffect(() => {
    if (!url) return undefined;

    setIsConnected(false);
    setError(false);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    const pc = new RTCPeerConnection({ iceServers: [] });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        if (videoRef.current.srcObject !== event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      }
      if (!connectedRef.current) {
        addLog('success', `STREAM [${title}]: Link established`);
      }
      setIsConnected(true);
      setError(false);
      connectedRef.current = true;
      errorRef.current = false;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        if (connectedRef.current || !errorRef.current) {
          addLog('error', `STREAM [${title}]: Link failure. Retrying...`);
        }
        setIsConnected(false);
        setError(true);
        connectedRef.current = false;
        errorRef.current = true;
        scheduleReconnect();
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
      }
    };

    ws.onopen = async () => {
      try {
        const offer = await pc.createOffer({ offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ type: 'offer', sdp: offer.sdp }));
      } catch (e) {
        console.error('WebRTC offer failed:', e);
        setError(true);
        errorRef.current = true;
        scheduleReconnect();
      }
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription({
            type: 'answer',
            sdp: message.sdp,
          }));
        } else if (message.type === 'ice' && message.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
      } catch (e) {
        console.error('WebRTC signaling error:', e);
      }
    };

    ws.onerror = () => {
      setError(true);
      errorRef.current = true;
      scheduleReconnect();
    };

    ws.onclose = () => {
      setIsConnected(false);
      setError(true);
      connectedRef.current = false;
      errorRef.current = true;
      scheduleReconnect();
    };

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [url, timestamp, addLog, scheduleReconnect, title]);

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
            placeholder="ws://..."
          />
          <button 
            onClick={handleSaveUrl}
            className="px-4 py-1.5 bg-k3s-secondary hover:bg-blue-600 text-white text-xs font-bold uppercase"
          >
            Set Source
          </button>
        </div>
      ) : null}

      {/* Stream Area - WebRTC Video */}
      <div className="relative flex-1 bg-black flex items-center justify-center min-h-0 overflow-hidden group">
        
        {/* Loading / Error State */}
        {(!isConnected || error) ? (
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
        ) : null}

<<<<<<< Updated upstream
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
        />
=======
        {isWebRtcLocal ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-contain transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
          />
        ) : (
          <img 
            ref={imgRef}
            src={streamUrl}
            alt={`${title} Stream`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`w-full h-full object-contain transition-opacity duration-500 ${isConnected ? 'opacity-100' : 'opacity-0'}`}
          />
        )}
>>>>>>> Stashed changes
        
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
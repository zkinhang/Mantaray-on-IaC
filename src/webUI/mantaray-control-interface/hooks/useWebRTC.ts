import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

interface UseWebRTCOptions {
  signalUrl: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  autoReconnectMs?: number;
}

interface UseWebRTCResult {
  isConnected: boolean;
  isConnecting: boolean;
  errorMessage: string | null;
  reconnect: () => void;
}

export const useWebRTC = ({
  signalUrl,
  videoRef,
  autoReconnectMs = 2000,
}: UseWebRTCOptions): UseWebRTCResult => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  const reconnectTimerRef = useRef<number | null>(null);

  const reconnect = useCallback(() => {
    setReconnectNonce((v) => v + 1);
  }, []);

  useEffect(() => {
    let isDisposed = false;
    let peerConnection: RTCPeerConnection | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      clearReconnectTimer();
      reconnectTimerRef.current = window.setTimeout(() => {
        if (!isDisposed) {
          setReconnectNonce((v) => v + 1);
        }
      }, autoReconnectMs);
    };

    const connect = async () => {
      if (!signalUrl) {
        setErrorMessage('Signal URL is empty');
        setIsConnected(false);
        setIsConnecting(false);
        return;
      }

      setIsConnecting(true);
      setIsConnected(false);
      setErrorMessage(null);

      try {
        peerConnection = new RTCPeerConnection();

        peerConnection.ontrack = (event) => {
          const [stream] = event.streams;
          if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
          }
        };

        peerConnection.onconnectionstatechange = () => {
          if (!peerConnection || isDisposed) {
            return;
          }

          const state = peerConnection.connectionState;
          if (state === 'connected') {
            setIsConnected(true);
            setIsConnecting(false);
            setErrorMessage(null);
            return;
          }

          if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            setIsConnected(false);
            setIsConnecting(false);
            setErrorMessage(`WebRTC state: ${state}`);
            scheduleReconnect();
          }
        };

        peerConnection.addTransceiver('video', { direction: 'recvonly' });

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        const response = await fetch(signalUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sdp: peerConnection.localDescription?.sdp,
            type: peerConnection.localDescription?.type,
          }),
        });

        if (!response.ok) {
          throw new Error(`Signal server returned ${response.status}`);
        }

        const answer = (await response.json()) as RTCSessionDescriptionInit;
        await peerConnection.setRemoteDescription(answer);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown WebRTC error';
        setErrorMessage(message);
        setIsConnected(false);
        setIsConnecting(false);
        scheduleReconnect();

        if (peerConnection) {
          peerConnection.close();
          peerConnection = null;
        }
      }
    };

    connect();

    return () => {
      isDisposed = true;
      clearReconnectTimer();

      if (peerConnection) {
        peerConnection.ontrack = null;
        peerConnection.onconnectionstatechange = null;
        peerConnection.close();
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [signalUrl, videoRef, autoReconnectMs, reconnectNonce]);

  return {
    isConnected,
    isConnecting,
    errorMessage,
    reconnect,
  };
};
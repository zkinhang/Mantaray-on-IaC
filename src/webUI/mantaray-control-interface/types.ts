export interface PowerLimits {
  upward: number;
  forward: number;
  yaw: number;
}

export interface TwistMessage {
  linear: { x: number; y: number; z: number };
  angular: { x: number; y: number; z: number };
}

export interface StreamConfig {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
}

export interface RosConnectionState {
  isConnected: boolean;
  mode: 'SIMULATION' | 'LIVE';
  lastMessage?: string;
}

export type Direction = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down' | 'stop';
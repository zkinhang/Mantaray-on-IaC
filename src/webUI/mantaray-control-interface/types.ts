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

// Power-limit axis keys shared between TelemetryPage and ControlPanel
export type PowerAxisKey = 'forward' | 'backward' | 'vertical' | 'yaw' | 'lateral' | 'view';

export interface PinnedPowerLimit {
  /** Human-readable axis label, e.g. "Forward" */
  axisLabel: string;
  /** Level label, e.g. "MED" */
  levelLabel: string;
  /** Numeric value, e.g. 0.5 */
  value: number;
}
import { TwistMessage } from '../types';

// Declare ROSLIB global since we are loading it via CDN in index.html
declare global {
  interface Window {
    ROSLIB: any;
  }
}

class RosService {
  private ros: any = null;
  private isConnected: boolean = false;
  private listeners: ((connected: boolean) => void)[] = [];
  private pidListeners: ((enabled: boolean) => void)[] = [];
  private logListeners: ((log: { type: 'info' | 'warn' | 'error' | 'success', message: string, timestamp: string }) => void)[] = [];
  
  // Topics
  private cmdVelTopic: any = null;
  private pidToggleSub: any = null;
  private pidTogglePub: any = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    // 1. Check for ROSLIB
    if (!window.ROSLIB) {
      console.log("[ROS] Waiting for ROSLIB...");
      setTimeout(() => this.connect(), 500);
      return;
    }

    // 2. Determine Connection Details
    // If running on the robot (local domain), use hostname. Otherwise default to mantaray.local.
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    // Use mantaray.local as default target, unless we are serving FROM the robot, then use that hostname.
    const targetHost = (window.location.hostname.includes('mantaray') || window.location.hostname.includes('rov')) 
      ? window.location.hostname 
      : '100.124.132.15';
    
    // Note: Standard ROS bridge usually runs on 9090
    const PORT = '9090';
    
    // 3. WebSocket Protocol Check (Fix for Mixed Content Error)
    // Browsers block ws:// from https:// pages.
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${targetHost}:${PORT}`;

    console.log(`[ROS] Attempting connection to: ${url}`);
    this.addLog('info', `Initializing ROS Bridge Link: ${url}`);

    try {
      this.ros = new window.ROSLIB.Ros({ url });

      this.ros.on('connection', () => {
        console.log('[ROS] Connected to websocket server.');
        this.isConnected = true;
        this.addLog('success', `Link established: ${url}`);
        this.setupTopics();
        this.notifyStatusListeners();
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      });

      this.ros.on('error', (error: any) => {
        console.log('[ROS] Connection error:', error);
        this.addLog('error', `Connection error: Check ROS Bridge @ ${targetHost}`);
        
        // Specific help for Mixed Content Error
        if (window.location.protocol === 'https:' && protocol === 'wss') {
           this.addLog('warn', "HTTPS detected. Using WSS protocol.");
        }
        
        this.isConnected = false;
        this.notifyStatusListeners();
      });

      this.ros.on('close', () => {
        console.log('[ROS] Connection closed.');
        this.addLog('warn', "Link terminated: Reconnect sequence initiated.");
        this.isConnected = false;
        this.notifyStatusListeners();
        
        // Auto-reconnect strategy
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), 5000);
      });
    } catch (e) {
      console.error("[ROS] Failed to initialize connection:", e);
      // If we failed synchronously (e.g. SecurityError), try again later
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    }
  }

  private setupTopics() {
    if (!this.ros) return;

    try {
        // Setup /cmd_vel Publisher
        this.cmdVelTopic = new window.ROSLIB.Topic({
        ros: this.ros,
        name: '/cmd_vel',
        messageType: 'geometry_msgs/Twist'
        });

        // Setup /pid/toggle Subscriber
        this.pidToggleSub = new window.ROSLIB.Topic({
        ros: this.ros,
        name: '/pid/toggle',
        messageType: 'std_msgs/Bool'
        });

        this.pidToggleSub.subscribe((message: { data: boolean }) => {
        console.log(`[ROS] Received /pid/toggle: ${message.data}`);
        this.notifyPidListeners(message.data);
        });

        // Setup /pid/toggle Publisher
        this.pidTogglePub = new window.ROSLIB.Topic({
        ros: this.ros,
        name: '/pid/toggle',
        messageType: 'std_msgs/Bool'
        });
    } catch (err) {
        console.error("[ROS] Error setting up topics:", err);
    }
  }

  public subscribeStatus(callback: (connected: boolean) => void) {
    this.listeners.push(callback);
    callback(this.isConnected);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public subscribePid(callback: (enabled: boolean) => void) {
    this.pidListeners.push(callback);
    return () => {
      this.pidListeners = this.pidListeners.filter(l => l !== callback);
    };
  }

  private notifyStatusListeners() {
    this.listeners.forEach(l => l(this.isConnected));
  }

  private notifyPidListeners(enabled: boolean) {
    this.pidListeners.forEach(l => l(enabled));
  }

  public addLog(type: 'info' | 'warn' | 'error' | 'success', message: string) {
    const log = {
      type,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    this.logListeners.forEach(l => l(log));
  }

  public subscribeLogs(callback: (log: { type: 'info' | 'warn' | 'error' | 'success', message: string, timestamp: string }) => void) {
    this.logListeners.push(callback);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== callback);
    };
  }

  public publishTwist(twist: TwistMessage) {
    if (!this.isConnected || !this.cmdVelTopic) return;
    
    const message = new window.ROSLIB.Message({
      linear: twist.linear,
      angular: twist.angular
    });
    
    this.cmdVelTopic.publish(message);
    const dir = twist.linear.x > 0 ? "FORWARD" : twist.linear.x < 0 ? "BACKWARD" : 
                twist.angular.z > 0 ? "LEFT" : twist.angular.z < 0 ? "RIGHT" : 
                twist.linear.z > 0 ? "ASCEND" : twist.linear.z < 0 ? "DESCEND" : "STOP";
    this.addLog('info', `TOPIC [/cmd_vel]: CMD=${dir}`);
  }

  public publishPidToggle(value: boolean) {
    if (!this.isConnected || !this.pidTogglePub) return;
    
    const message = new window.ROSLIB.Message({
      data: value
    });
    
    this.pidTogglePub.publish(message);
    this.addLog('info', `TOPIC [/pid/toggle]: STATE=${value ? 'ENABLED' : 'DISABLED'}`);
  }
}

export const rosService = new RosService();
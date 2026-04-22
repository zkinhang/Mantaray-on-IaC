import { TwistMessage } from '../types';

class RosService {
  private ros: any = null;
  private isConnected: boolean = false;
  private targetHost: string = localStorage.getItem('ros_target_host') || 
    ((window.location.hostname.includes('mantaray') || window.location.hostname.includes('rov')) 
    ? window.location.hostname 
    : 'localhost');
  private recentHosts: string[] = JSON.parse(localStorage.getItem('ros_recent_hosts') || '[]');

  private listeners: ((connected: boolean) => void)[] = [];
  private pidListeners: ((enabled: boolean) => void)[] = [];
  private powerLimitListeners: ((powerLimit: { forward: number; rightward: number; upward: number; roll: number; pitch: number; yaw: number }) => void)[] = [];
  private eulerListeners: ((euler: { roll: number; pitch: number; yaw: number }) => void)[] = [];
  private depthListeners: ((rawPressure: number) => void)[] = [];
  private logListeners: ((log: { type: 'info' | 'warn' | 'error' | 'success', message: string, timestamp: string }) => void)[] = [];
  
  // Topics
  private cmdVelTopic: any = null;
  private pidToggleSub: any = null;
  private pidTogglePub: any = null;
  private powerLimitSub: any = null;
  private powerLimitPub: any = null;
  private rollSub: any = null;
  private pitchSub: any = null;
  private yawSub: any = null;
  private depthSub: any = null;

  private currentEuler: { roll: number; pitch: number; yaw: number } = {
    roll: 0,
    pitch: 0,
    yaw: 0,
  };
  private currentDepthRaw: number = 0;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.connect();
  }

  public getTargetHost(): string {
    return this.targetHost;
  }

  public getRecentHosts(): string[] {
    return this.recentHosts;
  }

  public updateTargetHost(host: string) {
    if (!host) return;

    console.log(`[ROS] Updating target host to: ${host}`);
    this.targetHost = host;
    localStorage.setItem('ros_target_host', host);

    // Update recent hosts list
    const updatedRecents = [host, ...this.recentHosts.filter(h => h !== host)].slice(0, 5);
    this.recentHosts = updatedRecents;
    localStorage.setItem('ros_recent_hosts', JSON.stringify(updatedRecents));
    
    // Clear any existing reconnect timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ros) {
      try {
        // Remove listeners to prevent the 'close' event from triggering a 5s reconnect
        this.ros.removeAllListeners();
        this.ros.close();
      } catch (e) {
        console.error("[ROS] Error closing previous connection:", e);
      }
      this.ros = null;
    }
    
    this.isConnected = false;
    this.notifyStatusListeners();
    this.addLog('info', `Target host updated to ${host}. Reconnecting...`);
    
    // Immediate reconnect
    this.connect();
  }

  private connect() {
    // 2. Connection Details
    const targetHost = this.targetHost;
    
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

        // Setup /controller/power_limit Subscriber
        this.powerLimitSub = new window.ROSLIB.Topic({
          ros: this.ros,
          name: '/controller/power_limit',
          messageType: 'custom_interfaces/PowerLimit'
        });

        this.powerLimitSub.subscribe((message: { forward: number; rightward: number; upward: number; roll: number; pitch: number; yaw: number }) => {
          console.log(`[ROS] Received /controller/power_limit:`, message);
          this.notifyPowerLimitListeners(message);
        });

        // Setup /controller/power_limit Publisher (PowerLimit message)
        this.powerLimitPub = new window.ROSLIB.Topic({
          ros: this.ros,
          name: '/controller/power_limit',
          messageType: 'custom_interfaces/PowerLimit'
        });

        // Setup Euler angle subscribers (std_msgs/Float64)
        this.rollSub = new window.ROSLIB.Topic({
          ros: this.ros,
          name: '/system/roll',
          messageType: 'std_msgs/Float64'
        });

        this.pitchSub = new window.ROSLIB.Topic({
          ros: this.ros,
          name: '/system/pitch',
          messageType: 'std_msgs/Float64'
        });

        this.yawSub = new window.ROSLIB.Topic({
          ros: this.ros,
          name: '/system/yaw',
          messageType: 'std_msgs/Float64'
        });

        this.depthSub = new window.ROSLIB.Topic({
          ros: this.ros,
          name: '/system/depth',
          messageType: 'std_msgs/Float64'
        });

        this.rollSub.subscribe((message: { data: number }) => {
          this.currentEuler = { ...this.currentEuler, roll: message.data };
          this.notifyEulerListeners(this.currentEuler);
        });

        this.pitchSub.subscribe((message: { data: number }) => {
          this.currentEuler = { ...this.currentEuler, pitch: message.data };
          this.notifyEulerListeners(this.currentEuler);
        });

        this.yawSub.subscribe((message: { data: number }) => {
          this.currentEuler = { ...this.currentEuler, yaw: message.data };
          this.notifyEulerListeners(this.currentEuler);
        });

        this.depthSub.subscribe((message: { data: number }) => {
          this.currentDepthRaw = message.data;
          this.notifyDepthListeners(this.currentDepthRaw);
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

  public subscribePowerLimit(callback: (powerLimit: { forward: number; rightward: number; upward: number; roll: number; pitch: number; yaw: number }) => void) {
    this.powerLimitListeners.push(callback);
    return () => {
      this.powerLimitListeners = this.powerLimitListeners.filter(l => l !== callback);
    };
  }

  public subscribeEuler(callback: (euler: { roll: number; pitch: number; yaw: number }) => void) {
    this.eulerListeners.push(callback);
    callback(this.currentEuler);
    return () => {
      this.eulerListeners = this.eulerListeners.filter(l => l !== callback);
    };
  }

  public subscribeDepth(callback: (rawPressure: number) => void) {
    this.depthListeners.push(callback);
    callback(this.currentDepthRaw);
    return () => {
      this.depthListeners = this.depthListeners.filter(l => l !== callback);
    };
  }

  private notifyStatusListeners() {
    this.listeners.forEach(l => l(this.isConnected));
  }

  private notifyPidListeners(enabled: boolean) {
    this.pidListeners.forEach(l => l(enabled));
  }

  private notifyPowerLimitListeners(powerLimit: { forward: number; rightward: number; upward: number; roll: number; pitch: number; yaw: number }) {
    this.powerLimitListeners.forEach(l => l(powerLimit));
  }

  private notifyEulerListeners(euler: { roll: number; pitch: number; yaw: number }) {
    this.eulerListeners.forEach(l => l(euler));
  }

  private notifyDepthListeners(rawPressure: number) {
    this.depthListeners.forEach(l => l(rawPressure));
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
    console.log(`[ROS] Published to /cmd_vel:`, message);
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

  public publishPowerLimit(powerLimit: { forward: number; rightward: number; upward: number; roll: number; pitch: number; yaw: number }) {
    if (!this.isConnected) {
      console.warn('[ROS] Cannot publish power limit: Not connected');
      this.addLog('warn', 'Cannot publish power limit: Not connected to ROS');
      return;
    }
    
    if (!this.powerLimitPub) {
      console.warn('[ROS] Cannot publish power limit: Topic not initialized');
      this.addLog('warn', 'Cannot publish power limit: Topic not initialized');
      return;
    }

    const message = new window.ROSLIB.Message({
      forward: powerLimit.forward,
      rightward: powerLimit.rightward,
      upward: powerLimit.upward,
      roll: powerLimit.roll,
      pitch: powerLimit.pitch,
      yaw: powerLimit.yaw
    });

    try {
      this.powerLimitPub.publish(message);
      this.addLog('info', `TOPIC [/controller/power_limit]: forward=${powerLimit.forward.toFixed(2)} rightward=${powerLimit.rightward.toFixed(2)} upward=${powerLimit.upward.toFixed(2)} roll=${powerLimit.roll.toFixed(2)} pitch=${powerLimit.pitch.toFixed(2)} yaw=${powerLimit.yaw.toFixed(2)}`);
      console.log(`[ROS] Published to /controller/power_limit:`, message);
    } catch (err) {
      console.error('[ROS] Failed publishing power limit', err);
      this.addLog('error', `Failed to publish /controller/power_limit: ${err}`);
    }
  }
}

export const rosService = new RosService();
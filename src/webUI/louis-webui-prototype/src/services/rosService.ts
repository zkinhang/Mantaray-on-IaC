/**
 * ROS Service — Communicates with rosbridge_server via WebSocket
 * Publishes geometry_msgs/Twist to /cmd_vel topic
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Twist {
  linear: Vector3;
  angular: Vector3;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type StatusListener = (status: ConnectionStatus) => void;

class RosService {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: Set<StatusListener> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private targetHost = 'localhost:9090'; // Default rosbridge address

  /** Update the target robot IP/host */
  setTargetHost(host: string) {
    this.targetHost = host;
    // Reconnect if already connected
    if (this.ws) {
      this.disconnect();
      this.connect();
    }
  }

  getTargetHost(): string {
    return this.targetHost;
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    this.setStatus('connecting');
    try {
      this.ws = new WebSocket(`ws://${this.targetHost}`);

      this.ws.onopen = () => {
        this.setStatus('connected');
        console.log('[ROS] Connected to rosbridge at', this.targetHost);
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        console.log('[ROS] Disconnected');
      };

      this.ws.onerror = (err) => {
        this.setStatus('error');
        console.error('[ROS] WebSocket error', err);
      };

      this.ws.onmessage = (msg) => {
        // Handle incoming messages if needed
        console.log('[ROS] Message:', msg.data);
      };
    } catch (e) {
      this.setStatus('error');
      console.error('[ROS] Connection failed', e);
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  /** Publish a Twist message to /cmd_vel */
  publishTwist(twist: Twist, topic = '/cmd_vel') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[ROS] Not connected — cannot publish twist');
      return false;
    }

    const message = {
      op: 'publish',
      topic,
      msg: {
        linear: twist.linear,
        angular: twist.angular,
      },
    };

    this.ws.send(JSON.stringify(message));
    return true;
  }

  /** Advertise a topic (call once before first publish) */
  advertiseTopic(topic = '/cmd_vel', type = 'geometry_msgs/Twist') {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        op: 'advertise',
        topic,
        type,
      })
    );
  }
}

export const rosService = new RosService();

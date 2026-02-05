
export class RealtimeService {
  private ws: WebSocket | null = null;
  private log: (message: string) => void;
  private domain: string;
  private termid: string | null = null;
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;

  constructor(domain: string, logger: (message: string) => void = console.log) {
    this.domain = domain;
    this.log = (msg) => logger(`[RealtimeService] ${msg}`);
  }

  public setTermid(termid: string) {
    this.termid = termid;
  }

  public connect() {
    if (this.ws) {
      this.disconnect();
    }

    const isLocalhost = window.location.hostname === 'localhost';
    const url = isLocalhost
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/proxy/${this.domain}/`
      : `wss://${this.domain}.ringotel.co`;
      
    this.log(`Connecting to ${url}...`);

    try {
      this.ws = new WebSocket(url, 'json.api.smile-soft.com');

      this.ws.onopen = () => {
        this.log("Connected");
        this.startHeartbeat();
        if (this.termid) {
          const testMsg = {
            method: "getUserProfile",
            params: {
              termid: this.termid
            }
          };
          this.log(`Sending test message: ${JSON.stringify(testMsg)}`);
          this.send(testMsg);
        }
      };

      this.ws.onmessage = (event) => {
        this.log(`Message received: ${event.data}`);
        // Handle realtime events here if needed
      };

      this.ws.onerror = (error) => {
        this.log(`WebSocket error event triggered. Check network tab for details.`);
        console.error("[RealtimeService] WebSocket error:", error);
      };

      this.ws.onclose = (event) => {
        this.log(`Disconnected: ${event.code} ${event.reason || "(no reason provided)"}`);
        this.stopHeartbeat();
        if (event.code !== 1000) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      this.log(`Connection failed: ${(e as Error).message}`);
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional disconnect
      this.ws.close();
      this.ws = null;
      this.log("Disconnected manually");
    }
  }

  public send(data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.log("Cannot send message: WebSocket is not open");
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Many systems use an empty object or a specific ping method as a keep-alive
        this.send({ method: "ping", params: {} });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      window.clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.log("Scheduling reconnect in 5 seconds...");
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 5000);
  }
}


export class RealtimeService {
  private ws: WebSocket | null = null;
  private domain: string;
  private termid: string | null = null;
  private reconnectTimeout: number | null = null;
  private pingInterval: number | null = null;

  private uiLog: (message: string) => void;
  private onStatusChange?: (status: "disconnected" | "connecting" | "connected" | "error") => void;

  constructor(domain: string, logger: (message: string) => void = console.log, onStatusChange?: (status: "disconnected" | "connecting" | "connected" | "error") => void) {
    this.domain = domain;
    this.uiLog = logger;
    this.onStatusChange = onStatusChange;
  }

  private log(msg: string) {
    console.log(`[RealtimeService] ${msg}`);
  }

  private updateStatus(status: "disconnected" | "connecting" | "connected" | "error") {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
    this.uiLog(`[SYSTEM] API Status: ${status}`);
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
    this.uiLog(`[SYSTEM] Connecting to ${url}...`);
    this.updateStatus("connecting");

    try {
      this.ws = new WebSocket(url, 'json.api.smile-soft.com');

      this.ws.onopen = () => {
        this.log("Connected");
        this.updateStatus("connected");
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
        this.uiLog(`\n[↓ IN]: ${event.data}\n`);
        // Handle realtime events here if needed
      };

      this.ws.onerror = (error) => {
        this.log(`WebSocket error event triggered. Check network tab for details.`);
        console.error("[RealtimeService] WebSocket error:", error);
        this.uiLog(`[SYSTEM] WebSocket Error. Check browser console/network tab.`);
        this.updateStatus("error");
      };

      this.ws.onclose = (event) => {
        this.log(`Disconnected: ${event.code} ${event.reason || "(no reason provided)"}`);
        this.uiLog(`[SYSTEM] Disconnected (Code: ${event.code}, Reason: ${event.reason || "None"})`);
        this.updateStatus("disconnected");
        this.stopHeartbeat();
        if (event.code !== 1000) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      this.log(`Connection failed: ${(e as Error).message}`);
      this.uiLog(`[SYSTEM] Connection exception: ${(e as Error).message}`);
      this.updateStatus("error");
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
      this.updateStatus("disconnected");
    }
  }

  public send(data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify(data);
      this.uiLog(`\n[↑ OUT]: ${payload}\n`);
      this.ws.send(payload);
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

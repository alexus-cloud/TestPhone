import { SimpleUser } from "sip.js/lib/platform/web";
import type { SimpleUserOptions } from "sip.js/lib/platform/web";

import type { IncomingCallInfo, SipConfig } from "../types/sip.types";

export interface SipServiceEvents {
  onLog?: (message: string) => void;
  onServerConnect?: () => void;
  onServerDisconnect?: (error?: Error) => void;
  onRegistered?: () => void;
  onUnregistered?: () => void;
  onRegistrationFailed?: (error: Error) => void;
  onCallReceived?: (info: IncomingCallInfo) => void;
  onCallAnswered?: () => void;
  onCallHangup?: () => void;
  onCallHold?: (held: boolean) => void;
}

export class SipService {
  private user?: SimpleUser;
  private isOnHold = false;
  private config: SipConfig;
  private audioElement: HTMLAudioElement;
  private ringer: HTMLAudioElement;
  private events: SipServiceEvents;

  private id: string;

  private log(message: string) {
    this.events.onLog?.(`[SipService] ${message}`);
  }

  constructor(config: SipConfig, audioElement: HTMLAudioElement, events: SipServiceEvents = {}) {
    this.config = config;
    this.audioElement = audioElement;
    this.events = events;
    this.id = this.generateId(config.username);
    
    // Initialize ringer
    this.ringer = new Audio("/ringtone.mp3");
    this.ringer.loop = true;
  }

  private generateId(username: string): string {
    // Generate a stable ID based on username (simple hash)
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = ((hash << 5) - hash) + username.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  private buildOptions(): SimpleUserOptions {
    const { server, username, password, realm } = this.config;
    const resolvedRealm = realm || this.extractRealm(server);
    this.log(`Using realm: ${resolvedRealm || "(empty)"}`);

    return {
      aor: `sip:${username}@${resolvedRealm}`,
      media: {
        constraints: { audio: true, video: false },
        remote: { audio: this.audioElement },
      },
      userAgentOptions: {
        authorizationUsername: username,
        authorizationPassword: password,
        contactName: this.id,
        contactParams: { transport: "wss" },
        transportOptions: { 
          server,
          keepAliveInterval: 30, // seconds
          keepAliveDebounce: 10  // seconds
        },
        userAgentString: `Ringotel (${this.id}) SIP.js/0.21.2`,
        logLevel: "debug",
        logBuiltinEnabled: true,
        sessionDescriptionHandlerFactoryOptions: {
          iceGatheringTimeout: 2000,
          peerConnectionConfiguration: {
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
            bundlePolicy: "balanced",
            rtcpMuxPolicy: "negotiate",
          },
        },
      },
      delegate: {
        onCallReceived: () => {
          // Access the session from SimpleUser to get caller info
          const session = (this.user as any).session;
          const from = session?.remoteIdentity?.displayName || session?.remoteIdentity?.uri?.user || "Unknown";
          
          this.log(`Incoming call received from: ${from}`);
          
          // Start ringing
          this.ringer.play().catch(e => this.log(`Ringer play failed: ${e.message}`));
          
          this.events.onCallReceived?.({ from });
        },
        onCallAnswered: () => {
          this.log("Call answered and media streams established");
          
          // Stop ringing
          this.ringer.pause();
          this.ringer.currentTime = 0;
          
          // Debugging media
          try {
            const session = (this.user as any).session;
            const sdh = session?.sessionDescriptionHandler;
            const pc = sdh?.peerConnection;
            if (pc) {
              this.log(`ICE Connection State: ${pc.iceConnectionState}`);
              this.log(`Signaling State: ${pc.signalingState}`);
              const receivers = pc.getReceivers();
              this.log(`Number of remote tracks: ${receivers.length}`);
              receivers.forEach((r: any, i: number) => {
                this.log(`Track ${i}: ${r.track?.kind} - ${r.track?.label} (enabled: ${r.track?.enabled})`);
              });
            }
          } catch (e) {
            this.log(`Error checking media state: ${(e as Error).message}`);
          }

          // Explicitly play to satisfy some browser policies
          this.audioElement.play().catch(e => {
            this.log(`Audio play failed: ${e.message}. This might be due to browser autoplay policy.`);
          });
          
          this.events.onCallAnswered?.();
        },
        onCallHangup: () => {
          this.log("Call hangup");
          
          // Stop ringing
          this.ringer.pause();
          this.ringer.currentTime = 0;
          
          this.isOnHold = false;
          this.events.onCallHangup?.();
        },
        onCallHold: (held: boolean) => {
          this.log(`Call hold toggled: ${held}`);
          this.events.onCallHold?.(held);
        },
        onRegistered: () => {
          this.log("Registered");
          this.events.onRegistered?.();
        },
        onUnregistered: () => {
          this.log("Unregistered");
          this.events.onUnregistered?.();
        },
        onServerConnect: () => {
          this.log("Server connected");
          this.events.onServerConnect?.();
        },
        onServerDisconnect: (error?: Error) => {
          this.log(`Server disconnected${error ? `: ${error.message}` : ""}`);
          this.events.onServerDisconnect?.(error);
        },
      },
    };
  }

  async connect(): Promise<void> {
    if (!this.user) {
      this.log(`Creating SimpleUser for ${this.config.server}`);
      this.user = new SimpleUser(this.config.server, this.buildOptions());
    }
    this.log("Connecting...");
    await this.user.connect();
    this.log("Connected");
  }


  async register(): Promise<void> {
    if (!this.user) {
      await this.connect();
    }
    this.log("Registering...");
    await this.user?.register();
    this.log("Register request sent");
  }

  async disconnect(): Promise<void> {
    if (!this.user) return;
    this.log("Disconnecting...");
    await this.user.disconnect();
    this.log("Disconnected");
  }

  async call(destination: string): Promise<void> {
    if (!this.user) {
      await this.connect();
    }

    let target = destination;
    if (!target.startsWith("sip:")) {
      const { server, realm } = this.config;
      const resolvedRealm = realm || this.extractRealm(server);
      target = `sip:${destination}@${resolvedRealm}`;
    }

    this.log(`Calling ${target}...`);

    await this.user?.call(target, undefined, {
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false }
      }
    });
    this.log("Call request sent");
  }

  async answer(): Promise<void> {
    this.log("Answering call...");
    
    // Ensure audio element is ready
    try {
      if (this.audioElement.paused) {
        this.log("Audio element is paused, preparing for playback...");
      }
    } catch (err) {
      this.log(`Audio element check failed: ${(err as Error).message}`);
    }

    await this.user?.answer({
      sessionDescriptionHandlerOptions: {
        constraints: { audio: true, video: false }
      }
    });

    this.log("Answer sent");
  }

  async hangup(): Promise<void> {
    this.log("Hanging up...");
    await this.user?.hangup();
    this.log("Hangup sent");
  }

  async hold(): Promise<void> {
    if (!this.user || this.isOnHold) return;
    this.isOnHold = true;
    this.log("Hold request...");
    await this.user.hold();
  }

  async unhold(): Promise<void> {
    if (!this.user || !this.isOnHold) return;
    this.isOnHold = false;
    this.log("Unhold request...");
    await this.user.unhold();
  }

  mute(): void {
    this.log("Mute local audio");
    this.user?.mute();
  }

  unmute(): void {
    this.log("Unmute local audio");
    this.user?.unmute();
  }

  isMuted(): boolean {
    return this.user?.isMuted() ?? false;
  }

  isHeld(): boolean {
    return this.isOnHold;
  }

  private extractRealm(server: string): string {
    try {
      const url = new URL(server);
      return url.hostname;
    } catch {
      return "";
    }
  }
}

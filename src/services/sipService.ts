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
  private events: SipServiceEvents;

  private id: string;

  private log(message: string) {
    this.events.onLog?.(`[SipService] ${message}`);
  }

  constructor(config: SipConfig, audioElement: HTMLAudioElement, events: SipServiceEvents = {}) {
    this.config = config;
    this.audioElement = audioElement;
    this.events = events;
    this.id = this.generateId();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
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
        transportOptions: { server },
        userAgentString: `Ringotel (${this.id}) SIP.js/0.21.2`,
      },
      delegate: {
        onCallReceived: () => {
          this.log("Incoming call received");
          this.events.onCallReceived?.({ from: "Unknown" });
        },
        onCallAnswered: () => {
          this.log("Call answered");
          this.events.onCallAnswered?.();
        },
        onCallHangup: () => {
          this.log("Call hangup");
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
    this.log(`Calling ${destination}...`);
    await this.user?.call(destination);
    this.log("Call request sent");
  }

  async answer(): Promise<void> {
    this.log("Answering call...");
    await this.user?.answer();
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

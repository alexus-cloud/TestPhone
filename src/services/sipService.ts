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
  onAudioLevel?: (level: number) => void;
  onLocalAudioLevel?: (level: number) => void;
  onStats?: (stats: { 
    bytesReceived: number; 
    bytesSent: number; 
    packetsReceived: number; 
    packetsLost: number; 
    jitter: number;
    iceCandidatePair?: string;
    dtlsState?: string;
    tlsVersion?: string;
  }) => void;
}

export class SipService {
  private user?: SimpleUser;
  private isOnHold = false;
  private config: SipConfig;
  private audioElement: HTMLAudioElement;
  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private localAnalyser?: AnalyserNode;
  private monitorInterval?: number;
  private statsInterval?: number;
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
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              { urls: "stun:stun2.l.google.com:19302" },
              { urls: "stun:stun.ekiga.net" },
            ],
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
            const pc = sdh?.peerConnection as RTCPeerConnection | undefined;
            if (pc) {
              this.log(`Initial ICE Connection State: ${pc.iceConnectionState}`);
              this.log(`Signaling State: ${pc.signalingState}`);
              
              // Add listener for state changes
              pc.oniceconnectionstatechange = () => {
                this.log(`ICE Connection State Changed: ${pc.iceConnectionState}`);
              };

              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  this.log(`New ICE Candidate: ${event.candidate.candidate.split(" ")[7]} (${event.candidate.type})`);
                } else {
                  this.log("ICE Candidate gathering complete");
                }
              };

              pc.onicecandidateerror = (event: any) => {
                this.log(`ICE Candidate Error: ${event.errorText} (${event.errorCode}, URL: ${event.url})`);
              };
              
              const receivers = pc.getReceivers();
              this.log(`Number of remote tracks: ${receivers.length}`);
              receivers.forEach((r, i: number) => {
                this.log(`Track ${i}: ${r.track?.kind} - ${r.track?.label} (enabled: ${r.track?.enabled})`);
              });

              // Check if srcObject is set
              setTimeout(() => {
                if (this.audioElement.srcObject) {
                  this.log("Success: Audio element has srcObject attached");
                } else {
                  this.log("Warning: Audio element has NO srcObject attached! Attempting manual attachment...");
                  const remoteStream = new MediaStream();
                  receivers.forEach(r => {
                    if (r.track) remoteStream.addTrack(r.track);
                  });
                  this.audioElement.srcObject = remoteStream;
                  this.log("Manual attachment attempted");
                }
                
                // Start monitoring audio level and WebRTC stats
                this.monitorAudioLevel();
                this.startStatsMonitoring();
              }, 1000);
            }
          } catch (err) {
            this.log(`Error checking media state: ${(err as Error).message}`);
          }

          // Explicitly play to satisfy some browser policies
          this.audioElement.play().catch(e => {
            this.log(`Audio play failed: ${e.message}. This might be due to browser autoplay policy.`);
          });
          
          this.events.onCallAnswered?.();
        },
        onCallHangup: () => {
          this.log("Call hangup");
          
          this.stopAudioMonitoring();
          this.stopStatsMonitoring();
          
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

  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === "audioinput" || d.kind === "audiooutput");
    } catch (e) {
      this.log(`Error enumerating devices: ${(e as Error).message}`);
      return [];
    }
  }

  async testAudio(): Promise<void> {
    this.log("Testing audio output element...");
    const originalSrc = this.audioElement.srcObject;
    
    try {
      // Create a short beep using Web Audio API or just play a frequency
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      const osc = this.audioContext.createOscillator();
      const dest = this.audioContext.createMediaStreamDestination();
      osc.connect(dest);
      osc.start();
      osc.stop(this.audioContext.currentTime + 1);
      
      this.audioElement.srcObject = dest.stream;
      await this.audioElement.play();
      this.log("Test beep sent to audio element");
      
      setTimeout(() => {
        this.audioElement.srcObject = originalSrc;
        this.log("Restored original audio source");
      }, 1500);
    } catch (e) {
      this.log(`Test audio failed: ${(e as Error).message}`);
      this.audioElement.srcObject = originalSrc;
    }
  }

  public async reattachAudio(): Promise<void> {
    this.log("Manually re-attaching audio stream...");
    try {
      const pc = ((this.user as any).session?.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection | undefined;
      if (!pc) {
        this.log("Error: PeerConnection not found for re-attachment");
        return;
      }

      const remoteStream = new MediaStream();
      pc.getReceivers().forEach(receiver => {
        if (receiver.track) {
          this.log(`Adding remote track to stream: ${receiver.track.kind} (${receiver.track.label})`);
          remoteStream.addTrack(receiver.track);
        }
      });

      if (remoteStream.getTracks().length > 0) {
        this.audioElement.srcObject = remoteStream;
        await this.audioElement.play();
        this.log("Audio stream re-attached and playing");
        
        // Restart monitoring to be sure
        this.monitorAudioLevel();
      } else {
        this.log("Warning: No remote tracks found to re-attach");
      }
    } catch (e) {
      this.log(`Failed to re-attach audio: ${(e as Error).message}`);
    }
  }

  private monitorAudioLevel(): void {
    if (!this.audioElement.srcObject) return;
    
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume().then(() => this.log("AudioContext resumed"));
      }
      
      const stream = this.audioElement.srcObject as MediaStream;
      if (stream.getAudioTracks().length === 0) {
        this.log("No audio tracks to monitor");
        return;
      }

      stream.getAudioTracks().forEach((track, i) => {
        this.log(`Monitoring track ${i}: ${track.label} [state: ${track.readyState}, enabled: ${track.enabled}, muted: ${track.muted}]`);
      });

      // Detailed WebRTC state logging
      const pc = ((this.user as any).session?.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection | undefined;
      if (pc) {
        this.log(`PC State: Signaling=${pc.signalingState}, ICE=${pc.iceConnectionState}, Gathering=${pc.iceGatheringState}`);
        pc.getSenders().forEach((s, i) => {
          this.log(`Sender ${i}: ${s.track?.kind} [state=${s.track?.readyState}, enabled=${s.track?.enabled}]`);
        });
        pc.getReceivers().forEach((r, i) => {
          this.log(`Receiver ${i}: ${r.track?.kind} [state=${r.track?.readyState}, enabled=${r.track?.enabled}]`);
        });
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      this.log("Audio monitoring started");
      
      // Also monitor local mic if available
      const session = (this.user as any).session;
      const localStream = session?.sessionDescriptionHandler?.localMediaStream as MediaStream | undefined;
      let localBufferLength = 0;
      let localDataArray: Uint8Array | null = null;

      if (localStream && localStream.getAudioTracks().length > 0) {
        this.localAnalyser = this.audioContext.createAnalyser();
        this.localAnalyser.fftSize = 256;
        const localSource = this.audioContext.createMediaStreamSource(localStream);
        localSource.connect(this.localAnalyser);
        localBufferLength = this.localAnalyser.frequencyBinCount;
        localDataArray = new Uint8Array(localBufferLength);
      }

      if (this.monitorInterval) window.clearInterval(this.monitorInterval);
      
      this.monitorInterval = window.setInterval(() => {
        // Remote
        if (this.analyser) {
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
          this.events.onAudioLevel?.(sum / bufferLength);
        }
        // Local
        if (this.localAnalyser && localDataArray) {
          this.localAnalyser.getByteFrequencyData(localDataArray);
          let localSum = 0;
          for (let i = 0; i < localBufferLength; i++) localSum += localDataArray[i];
          this.events.onLocalAudioLevel?.(localSum / localBufferLength);
        }
      }, 100);
    } catch (e) {
      this.log(`Failed to start audio monitoring: ${(e as Error).message}`);
    }
  }

  private stopAudioMonitoring(): void {
    if (this.monitorInterval) {
      window.clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
    this.analyser = undefined;
    this.localAnalyser = undefined;
    this.log("Audio monitoring stopped");
  }

  private startStatsMonitoring(): void {
    const pc = ((this.user as any).session?.sessionDescriptionHandler as any)?.peerConnection as RTCPeerConnection | undefined;
    if (!pc) return;

    this.statsInterval = window.setInterval(async () => {
      try {
        const stats = await pc.getStats();
        let bytesReceived = 0;
        let bytesSent = 0;
        let packetsReceived = 0;
        let packetsLost = 0;
        let jitter = 0;
        let iceCandidatePair = "";
        let dtlsState = "";
        let tlsVersion = "";

        stats.forEach(report => {
          if (report.type === "inbound-rtp" && report.kind === "audio") {
            bytesReceived = report.bytesReceived;
            packetsReceived = report.packetsReceived;
            packetsLost = report.packetsLost;
            jitter = report.jitter;
          }
          if (report.type === "outbound-rtp" && report.kind === "audio") {
            bytesSent = report.bytesSent;
          }
          if (report.type === "transport") {
            dtlsState = report.dtlsState;
          }
          if (report.type === "certificate") {
            // Certificate reports sometimes contain protocol information
            if (report.protocol) {
              tlsVersion = report.protocol;
            }
          }
          if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated) {
            const local = stats.get(report.localCandidateId);
            const remote = stats.get(report.remoteCandidateId);
            if (local && remote) {
              iceCandidatePair = `${local.candidateType} (${local.ip}:${local.port}) -> ${remote.candidateType} (${remote.ip}:${remote.port}) [${report.writable ? "writable" : "not-writable"}]`;
            }
          }
        });

        this.events.onStats?.({ 
          bytesReceived, 
          bytesSent, 
          packetsReceived, 
          packetsLost, 
          jitter, 
          iceCandidatePair, 
          dtlsState,
          tlsVersion 
        });
      } catch (e) {
        this.log(`Error getting stats: ${(e as Error).message}`);
      }
    }, 2000);
  }

  private stopStatsMonitoring(): void {
    if (this.statsInterval) {
      window.clearInterval(this.statsInterval);
      this.statsInterval = undefined;
    }
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

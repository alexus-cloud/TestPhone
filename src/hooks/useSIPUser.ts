import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SipService } from "../services/sipService";
import { ProvisioningService } from "../services/provisioningService";
import { RealtimeService } from "../services/realtimeService";
import type { CallState, IncomingCallInfo, RegistrationStatus, SipConfig } from "../types/sip.types";

export const useSIPUser = (audioRef: React.RefObject<HTMLAudioElement | null>) => {
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>("disconnected");
  const [callState, setCallState] = useState<CallState>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [micReady, setMicReady] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [stats, setStats] = useState<{ 
    bytesReceived: number; 
    bytesSent: number; 
    packetsReceived: number; 
    packetsLost: number; 
    jitter: number;
    roundTripTime: number;
    audioLevel: number;
    iceCandidatePair?: string;
    dtlsState?: string;
    tlsVersion?: string;
  } | null>(null);

  const [customConfig, setCustomConfig] = useState<Partial<SipConfig>>(() => {
    try {
      const saved = localStorage.getItem("sip_credentials");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const [shouldConnect, setShouldConnect] = useState(false);
  const serviceRef = useRef<SipService | null>(null);
  const realtimeRef = useRef<RealtimeService | null>(null);
  const isProcessingRef = useRef(false);

  const config: SipConfig = useMemo(() => {
    const domain = customConfig.domain || import.meta.env.VITE_SIP_DOMAIN || "";
    return {
      domain,
      server: customConfig.server || (domain ? `wss://${domain}.ringotel.co` : (import.meta.env.VITE_SIP_SERVER || "")),
      username: customConfig.username || import.meta.env.VITE_SIP_USERNAME || "",
      password: customConfig.password || import.meta.env.VITE_SIP_PASSWORD || "",
      realm: customConfig.realm || import.meta.env.VITE_SIP_REALM || "",
    };
  }, [customConfig]);

  const hasEnvConfig = useMemo(() => {
    return !!(import.meta.env.VITE_SIP_SERVER && import.meta.env.VITE_SIP_USERNAME && import.meta.env.VITE_SIP_PASSWORD);
  }, []);

  const pushLog = useCallback((message: string) => {
    setLogs((prev) => [...prev.slice(-199), message]);
    console.log(message);
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    const service = new SipService(config, audioRef.current, {
      onLog: (message) => pushLog(message),
      onServerConnect: () => {
        setRegistrationStatus("connecting");
        pushLog("SIP server connected");
      },
      onServerDisconnect: (error) => {
        setRegistrationStatus("disconnected");
        pushLog(`SIP server disconnected${error ? `: ${error.message}` : ""}`);
      },
      onRegistered: () => {
        setRegistrationStatus("registered");
        pushLog("SIP registered");
        // Always save manual credentials to localStorage on success
        localStorage.setItem("sip_credentials", JSON.stringify(customConfig));
      },
      onUnregistered: () => {
        setRegistrationStatus("disconnected");
        pushLog("SIP unregistered");
      },
      onCallReceived: (info) => {
        setIncomingCall(info);
        setCallState("incoming");
        pushLog(`Incoming call from ${info.from}`);
      },
      onCallAnswered: () => {
        setCallState("active");
        pushLog("Call active");
      },
      onCallHangup: () => {
        setCallState("idle");
        setIncomingCall(null);
        setIsOnHold(false);
        pushLog("Call ended");
      },
      onCallHold: (held) => {
        setIsOnHold(held);
        setCallState(held ? "held" : "active");
        pushLog(held ? "Call held" : "Call resumed");
      },
      onAudioLevel: (level) => {
        setAudioLevel(level);
      },
      onLocalAudioLevel: (level) => {
        setLocalAudioLevel(level);
      },
      onStats: (s) => {
        setStats(s);
      }
    });

    serviceRef.current = service;

    return () => {
      service.disconnect().catch(() => undefined);
      serviceRef.current = null;
      if (realtimeRef.current) {
        realtimeRef.current.disconnect();
        realtimeRef.current = null;
      }
    };
  }, [audioRef, config, pushLog, hasEnvConfig, customConfig]);

  const checkMicPermissions = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicReady(true);
      pushLog("Microphone permission granted");
    } catch (error) {
      setMicReady(false);
      pushLog(`Microphone permission denied: ${(error as Error).message}`);
    }
  }, [pushLog]);

  const connectAndRegister = useCallback(async (newConfig?: Partial<SipConfig>) => {
    try {
      if (newConfig) {
        setCustomConfig(prev => ({ ...prev, ...newConfig }));
        setShouldConnect(true); // Trigger connection in effect after state update
        return; 
      }

      const activeDomain = customConfig.domain || import.meta.env.VITE_SIP_DOMAIN || "";
      const activeConfig: SipConfig = {
        domain: activeDomain,
        server: customConfig.server || (activeDomain ? `wss://${activeDomain}.ringotel.co` : (import.meta.env.VITE_SIP_SERVER || "")),
        username: customConfig.username || import.meta.env.VITE_SIP_USERNAME || "",
        password: customConfig.password || import.meta.env.VITE_SIP_PASSWORD || "",
        realm: customConfig.realm || import.meta.env.VITE_SIP_REALM || "",
      };

      if (!activeConfig.domain || !activeConfig.username || !activeConfig.password) {
        pushLog("Missing credentials, waiting for manual entry...");
        return;
      }

      setRegistrationStatus("connecting");
      
      // Perform provisioning first
      let sipCredentials = undefined;
      try {
        pushLog(`Starting provisioning for ${activeConfig.username}@${activeConfig.domain}...`);
        const provisioningService = new ProvisioningService(activeConfig, (msg: string) => pushLog(msg));
        const { extension, userid, termpass } = await provisioningService.provision();
        pushLog(`Provisioning successful for extension ${extension}`);
        
        // Map provisioning results to SIP registration parameters
        sipCredentials = { 
          username: extension, 
          authUsername: userid, 
          password: termpass 
        };
      } catch (provError) {
        pushLog(`Provisioning failed: ${(provError as Error).message}`);
        setRegistrationStatus("error");
        return;
      }

      await serviceRef.current?.connect(sipCredentials);
      await serviceRef.current?.register();

      // Connect Realtime channel
      try {
        if (realtimeRef.current) realtimeRef.current.disconnect();
        realtimeRef.current = new RealtimeService(activeConfig.domain!, (msg: string) => pushLog(msg));
        if (sipCredentials) {
          realtimeRef.current.setTermid(sipCredentials.authUsername);
        }
        realtimeRef.current.connect();
      } catch (realtimeError) {
        pushLog(`Realtime connection failed: ${(realtimeError as Error).message}`);
      }
      
      // Automatically request microphone permissions after registration
      if (!micReady) {
        pushLog("Requesting microphone permission...");
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicReady(true);
          pushLog("Microphone ready");
        } catch (micError) {
          pushLog(`Microphone access denied: ${(micError as Error).message}`);
        }
      }
    } catch (error) {
      setRegistrationStatus("error");
      pushLog(`Registration error: ${(error as Error).message}`);
    } finally {
      isProcessingRef.current = false;
    }
  }, [pushLog, micReady, customConfig]);

  // Effect to handle connection after config update
  useEffect(() => {
    if (shouldConnect && serviceRef.current && registrationStatus === "disconnected") {
      // Use a timeout or next tick to avoid synchronous setState warning
      const timer = setTimeout(() => {
        setShouldConnect(false);
        connectAndRegister();
      }, 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [shouldConnect, registrationStatus, connectAndRegister]);

  const startCall = useCallback(
    async (destination: string) => {
      try {
        setCallState("calling");
        await serviceRef.current?.call(destination);
      } catch (error) {
        setCallState("idle");
        pushLog(`Call failed: ${(error as Error).message}`);
      }
    },
    [pushLog],
  );

  const answerCall = useCallback(async () => {
    try {
      // Ensure we have microphone access before answering
      if (!micReady) {
        pushLog("Requesting microphone permission before answering...");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
          setMicReady(true);
          pushLog("Microphone permission granted");
        } catch (micError) {
          pushLog(`Cannot answer: microphone permission denied - ${(micError as Error).message}`);
          setCallState("idle");
          setIncomingCall(null);
          return;
        }
      }
      
      await serviceRef.current?.answer();
      setCallState("active");
    } catch (error) {
      pushLog(`Answer failed: ${(error as Error).message}`);
      setCallState("idle");
      setIncomingCall(null);
    }
  }, [pushLog, micReady]);

  const hangupCall = useCallback(async () => {
    try {
      await serviceRef.current?.hangup();
      setCallState("idle");
      setIncomingCall(null);
    } catch (error) {
      pushLog(`Hangup failed: ${(error as Error).message}`);
    }
  }, [pushLog]);

  const holdCall = useCallback(async () => {
    await serviceRef.current?.hold();
    setIsOnHold(true);
  }, []);

  const unholdCall = useCallback(async () => {
    await serviceRef.current?.unhold();
    setIsOnHold(false);
  }, []);

  const toggleMute = useCallback(() => {
    const service = serviceRef.current;
    if (!service) return;

    if (service.isMuted()) {
      service.unmute();
      setIsMuted(false);
      pushLog("Microphone unmuted");
    } else {
      service.mute();
      setIsMuted(true);
      pushLog("Microphone muted");
    }
  }, [pushLog]);

  return {
    registrationStatus,
    callState,
    incomingCall,
    isMuted,
    isOnHold,
    logs,
    micReady,
    checkMicPermissions,
    connectAndRegister,
    startCall,
    answerCall,
    hangupCall,
    holdCall,
    unholdCall,
    toggleMute,
    audioLevel,
    localAudioLevel,
    stats,
    hasEnvConfig,
    reattachAudio: () => serviceRef.current?.reattachAudio() ?? Promise.resolve(),
    listDevices: async () => {
      const devices = await serviceRef.current?.getAudioDevices();
      if (devices) {
        pushLog(`Audio Devices found (${devices.length}):`);
        devices.forEach(d => pushLog(`- [${d.kind}] ${d.label || "Unnamed device"}`));
      }
      return devices || [];
    },
    testAudio: () => serviceRef.current?.testAudio() ?? Promise.resolve(),
  };
};

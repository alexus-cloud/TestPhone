import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SipService } from "../services/sipService";
import type { CallState, IncomingCallInfo, RegistrationStatus, SipConfig } from "../types/sip.types";

export const useSIPUser = (audioRef: React.RefObject<HTMLAudioElement | null>) => {
  const [registrationStatus, setRegistrationStatus] = useState<RegistrationStatus>("disconnected");
  const [callState, setCallState] = useState<CallState>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [micReady, setMicReady] = useState(false);

  const serviceRef = useRef<SipService | null>(null);

  const config: SipConfig = useMemo(
    () => ({
      server: import.meta.env.VITE_SIP_SERVER,
      username: import.meta.env.VITE_SIP_USERNAME,
      password: import.meta.env.VITE_SIP_PASSWORD,
      realm: import.meta.env.VITE_SIP_REALM,
    }),
    [],
  );

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
    });

    serviceRef.current = service;

    return () => {
      service.disconnect().catch(() => undefined);
      serviceRef.current = null;
    };
  }, [audioRef, config, pushLog]);

  const checkMicPermissions = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicReady(true);
      pushLog("Microphone permission granted");
    } catch (error) {
      setMicReady(false);
      pushLog(`Microphone permission denied: ${(error as Error).message}`);
    }
  }, [pushLog]);

  const connectAndRegister = useCallback(async () => {
    try {
      setRegistrationStatus("connecting");
      await serviceRef.current?.connect();
      await serviceRef.current?.register();
    } catch (error) {
      setRegistrationStatus("error");
      pushLog(`Registration error: ${(error as Error).message}`);
    }
  }, [pushLog]);

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
      await serviceRef.current?.answer();
      setCallState("active");
    } catch (error) {
      pushLog(`Answer failed: ${(error as Error).message}`);
    }
  }, [pushLog]);

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
  };
};

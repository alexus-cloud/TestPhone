import { useEffect, useMemo, useRef, useState } from "react";

import { SIPStatus } from "./components/SIPStatus";
import { ActiveCallCard } from "./components/ActiveCallCard";
import { Dialpad } from "./components/Dialpad";
import { LogsPanel } from "./components/LogsPanel";
import { AudioPanel } from "./components/AudioPanel";
import { useSIPUser } from "./hooks/useSIPUser";
import "./App.css";

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

function App() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [dialValue, setDialValue] = useState("");
  const [callSeconds, setCallSeconds] = useState(0);
  const [loginData, setLoginData] = useState(() => {
    const saved = localStorage.getItem("sip_credentials");
    const parsed = saved ? JSON.parse(saved) : {};
    return { 
      domain: parsed.domain || import.meta.env.VITE_SIP_DOMAIN || "",
      username: parsed.username || import.meta.env.VITE_SIP_USERNAME || "", 
      password: parsed.password || import.meta.env.VITE_SIP_PASSWORD || "", 
      server: parsed.server || import.meta.env.VITE_SIP_SERVER || "", 
      realm: parsed.realm || import.meta.env.VITE_SIP_REALM || "" 
    };
  });

  const {
    registrationStatus,
    callState,
    incomingCall,
    isMuted,
    isOnHold,
    logs,
    micReady,
    connectAndRegister,
    startCall,
    answerCall,
    hangupCall,
    holdCall,
    unholdCall,
    toggleMute,
    testAudio,
    listDevices,
    audioLevel,
    localAudioLevel,
    stats,
    reattachAudio,
    hasEnvConfig,
  } = useSIPUser(audioRef);

  useEffect(() => {
    const win = window as unknown as { testAudio: typeof testAudio; listDevices: typeof listDevices };
    win.testAudio = testAudio;
    win.listDevices = listDevices;
  }, [testAudio, listDevices]);

  const peer = useMemo(() => incomingCall?.from || dialValue, [incomingCall?.from, dialValue]);
  const callDuration = useMemo(() => formatDuration(callSeconds), [callSeconds]);

  useEffect(() => {
    if (callState === "active") {
      const timer = window.setInterval(() => setCallSeconds((prev) => prev + 1), 1000);
      return () => {
        window.clearInterval(timer);
        // Reset on cleanup when leaving active state
        setCallSeconds(0);
      };
    }
    return undefined;
  }, [callState]);

  // Auto-connect on mount ONLY if .env config is present
  useEffect(() => {
    if (hasEnvConfig) {
      connectAndRegister();
    }
  }, [connectAndRegister, hasEnvConfig]);

  const handleCall = async () => {
    if (!dialValue.trim()) return;
    await startCall(dialValue.trim());
  };

  const handleHoldToggle = async () => {
    if (isOnHold) {
      await unholdCall();
    } else {
      await holdCall();
    }
  };

  const canAnswer = callState === "incoming";
  const canHangup = callState !== "idle";
  const canHold = callState === "active" || callState === "held";
  const canMute = callState === "active" || callState === "held";

  return (
    <div className="app">
      <header>
        <div className="header-start">
          <img 
            src="https://cdn.prod.website-files.com/68e3d8e3470ae9fccf3ee8a0/68e4d316e6c643add78a645a_Logo.svg" 
            alt="Ringotel Logo" 
            className="app-logo"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
        
        <div className="header-center">
          <h1>Ringotel Test Softphone</h1>
          <p>Validated SIP server compatibility for Ringotel users.</p>
        </div>

        <div className="header-end actions">
          {/* Auto-connect enabled - no manual buttons needed */}
        </div>
      </header>

      <main>
        <div className="left-column">
          <SIPStatus 
            status={registrationStatus} 
            username={loginData.username} 
            server={loginData.server} 
            loginData={loginData}
            onLoginDataChange={setLoginData}
            onConnect={() => connectAndRegister(loginData)}
          />
          
          <ActiveCallCard 
            callState={callState} 
            peer={peer} 
            duration={callDuration} 
            canAnswer={canAnswer}
            canHangup={canHangup}
            canHold={canHold}
            canMute={canMute}
            isOnHold={isOnHold}
            isMuted={isMuted}
            onAnswer={answerCall}
            onHangup={hangupCall}
            onToggleHold={handleHoldToggle}
            onToggleMute={toggleMute}
          />

          <Dialpad value={dialValue} onChange={setDialValue} onCall={handleCall} disabled={!micReady} />
        </div>
        <div className="right-column">
          <AudioPanel 
            localAudioLevel={localAudioLevel}
            audioLevel={audioLevel}
            onTestSpeaker={testAudio}
            onLogDevices={listDevices}
            onReattachAudio={reattachAudio}
            isCallActive={callState !== "idle"}
          />
          <section className="card stats" style={{ marginBottom: "20px", opacity: stats ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <h2 style={{ fontSize: "0.9rem", margin: 0 }}>WebRTC Stats</h2>
              <span style={{ fontSize: "0.7rem", color: stats?.dtlsState === "connected" ? "#22c55e" : "#64748b", fontWeight: "bold" }}>
                DTLS: {stats?.dtlsState || "Idle"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.75rem" }}>
              <div>
                <div style={{ opacity: 0.6 }}>Packet Lost</div>
                <div style={{ fontWeight: 600, color: (stats?.packetsLost || 0) > 0 ? "#dc2626" : "inherit" }}>{stats?.packetsLost ?? "--"}</div>
              </div>
              <div>
                <div style={{ opacity: 0.6 }}>Jitter</div>
                <div style={{ fontWeight: 600 }}>{stats ? `${(stats.jitter * 1000).toFixed(2)}ms` : "--"}</div>
              </div>
              <div>
                <div style={{ opacity: 0.6 }}>RTT</div>
                <div style={{ fontWeight: 600 }}>{stats ? `${(stats.roundTripTime * 1000).toFixed(2)}ms` : "--"}</div>
              </div>
              <div>
                <div style={{ opacity: 0.6 }}>Audio Level</div>
                <div style={{ fontWeight: 600 }}>{stats?.audioLevel ?? "--"}</div>
              </div>
              <div style={{ gridColumn: "span 2", marginTop: "5px", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "5px" }}>
                <div style={{ opacity: 0.6, fontSize: "0.7rem" }}>ICE Path</div>
                <div style={{ fontWeight: 600, wordBreak: "break-all", fontSize: "0.65rem", color: stats?.iceCandidatePair ? "inherit" : "#94a3b8" }}>
                  {stats?.iceCandidatePair || "Awaiting connection..."}
                </div>
              </div>
            </div>
          </section>
          <LogsPanel logs={logs} />
        </div>
      </main>

      <audio ref={audioRef} autoPlay playsInline />
    </div>
  );
}

export default App;

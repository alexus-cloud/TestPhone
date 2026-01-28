import { useEffect, useMemo, useRef, useState } from "react";

import { CallControls } from "./components/CallControls";
import { CallStatus } from "./components/CallStatus";
import { Dialpad } from "./components/Dialpad";
import { IncomingCall } from "./components/IncomingCall";
import { LogsPanel } from "./components/LogsPanel";
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
        <div>
          <h1>SIP.js Test Phone</h1>
          <p>Minimal softphone to validate SIP server compatibility.</p>
        </div>
        <div className="actions">
          {/* Auto-connect enabled - no manual buttons needed */}
        </div>
      </header>

      <main>
        <div className="left-column">
          <CallStatus
            registrationStatus={registrationStatus}
            callState={callState}
            peer={peer}
            duration={callDuration}
          />
          {callState !== "idle" && (
            <div className="audio-monitor" style={{ 
              marginTop: "0.5rem", 
              padding: "0.75rem", 
              background: "#f1f5f9", 
              borderRadius: "10px",
              border: "1px solid #e2e8f0"
            }}>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                  <span>Local Mic Level (Outgoing)</span>
                  <span>{Math.round(localAudioLevel)}</span>
                </div>
                <div style={{ height: "12px", background: "#cbd5e1", borderRadius: "6px", overflow: "hidden" }}>
                  <div style={{ 
                    height: "100%", 
                    width: `${Math.min(100, (localAudioLevel / 128) * 100)}%`, 
                    background: localAudioLevel > 50 ? "#22c55e" : "#3b82f6",
                    transition: "width 0.1s ease-out"
                  }} />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                  <span>Remote Audio Level (Incoming)</span>
                  <span>{Math.round(audioLevel)}</span>
                </div>
                <div style={{ 
                  height: "12px", 
                  background: "#cbd5e1", 
                  borderRadius: "6px", 
                  overflow: "hidden",
                  cursor: "pointer"
                }} 
                onClick={reattachAudio}
                title="Click to re-attach audio"
                >
                  <div style={{ 
                    height: "100%", 
                    width: `${Math.min(100, (audioLevel / 128) * 100)}%`, 
                    background: audioLevel > 50 ? "#22c55e" : "#3b82f6",
                    transition: "width 0.1s ease-out",
                    boxShadow: audioLevel > 50 ? "0 0 8px rgba(34, 197, 94, 0.4)" : "none"
                  }} />
                </div>
              </div>
              <button 
                onClick={reattachAudio} 
                style={{ fontSize: "0.75rem", width: "100%", marginTop: "0.5rem" }}
                className="ghost"
              >
                🔄 Re-attach Audio
              </button>
            </div>
          )}

          {registrationStatus === "registered" ? (
            <>
              <Dialpad value={dialValue} onChange={setDialValue} onCall={handleCall} disabled={!micReady} />
              {incomingCall && callState === "incoming" && (
                <IncomingCall from={incomingCall.from} onAnswer={answerCall} onDecline={hangupCall} />
              )}
              <CallControls
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
            </>
          ) : (
            <section className="card login-form" style={{ marginTop: "1rem" }}>
              <h2>SIP Credentials</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="input-group">
                  <label style={{ fontSize: "0.75rem", opacity: 0.6 }}>Server (WSS)</label>
                  <input 
                    type="text" 
                    placeholder="wss://..." 
                    value={loginData.server}
                    onChange={(e) => setLoginData({...loginData, server: e.target.value})}
                    className="input"
                    disabled={registrationStatus === "connecting"}
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: "0.75rem", opacity: 0.6 }}>Username</label>
                  <input 
                    type="text" 
                    placeholder="Username" 
                    value={loginData.username}
                    onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                    className="input"
                    disabled={registrationStatus === "connecting"}
                  />
                </div>
                <div className="input-group">
                  <label style={{ fontSize: "0.75rem", opacity: 0.6 }}>Password</label>
                  <input 
                    type="password" 
                    placeholder="Password" 
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="input"
                    disabled={registrationStatus === "connecting"}
                  />
                </div>
                <button 
                  className="btn primary" 
                  onClick={() => connectAndRegister(loginData)}
                  disabled={registrationStatus === "connecting"}
                >
                  {registrationStatus === "connecting" ? "Connecting..." : "Connect & Register"}
                </button>
              </div>
            </section>
          )}

          <div className="debug-tools" style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <button className="btn secondary" onClick={async () => {
              await testAudio();
            }}>Test Speaker</button>
            <button className="btn secondary" onClick={async () => {
              const devices = await listDevices();
              console.table(devices);
              alert("Check console for device list. If labels are empty, ensure you have granted microphone permission and refreshed.");
            }}>Log Devices</button>
          </div>
        </div>
        <div className="right-column">
          <LogsPanel logs={logs} />
          
          {registrationStatus === "registered" && (
            <section className="card session-info" style={{ marginBottom: "1rem" }}>
              <h2>Active Session</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.85rem" }}>
                <li style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ opacity: 0.6 }}>Server:</span>
                  <strong>{loginData.server}</strong>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.6 }}>User:</span>
                  <strong>{loginData.username}</strong>
                </li>
              </ul>
            </section>
          )}

          {stats && (
            <section className="card stats">
              <h2>WebRTC Stats</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.85rem" }}>
                <div>
                  <div style={{ opacity: 0.6 }}>Packet Rcvd</div>
                  <div style={{ fontWeight: 600 }}>{stats.packetsReceived}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6 }}>Packet Lost</div>
                  <div style={{ fontWeight: 600, color: stats.packetsLost > 0 ? "#dc2626" : "inherit" }}>{stats.packetsLost}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6 }}>Jitter</div>
                  <div style={{ fontWeight: 600 }}>{stats.jitter.toFixed(4)}</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6 }}>Bytes In</div>
                  <div style={{ fontWeight: 600 }}>{(stats.bytesReceived / 1024).toFixed(1)} KB</div>
                </div>
                <div>
                  <div style={{ opacity: 0.6 }}>Bytes Out</div>
                  <div style={{ fontWeight: 600 }}>{(stats.bytesSent / 1024).toFixed(1)} KB</div>
                </div>
                {stats.iceCandidatePair && (
                  <div style={{ gridColumn: "span 2", marginTop: "5px", borderTop: "1px solid rgba(0,0,0,0.05)", paddingTop: "5px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ opacity: 0.6 }}>ICE Path</span>
                      <span style={{ fontSize: "0.7rem", color: stats.dtlsState === "connected" ? "#22c55e" : "#e11d48", fontWeight: "bold" }}>
                        DTLS: {stats.dtlsState || "unknown"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 600, wordBreak: "break-all" }}>{stats.iceCandidatePair}</div>
                    <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "2px" }}>
                      Protocol: {stats.tlsVersion || (stats.dtlsState === "connecting" ? "Handshaking..." : "Unknown")}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      <audio ref={audioRef} autoPlay playsInline />
    </div>
  );
}

export default App;

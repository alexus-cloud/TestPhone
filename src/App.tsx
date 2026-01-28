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
  } = useSIPUser(audioRef);

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

  // Auto-connect on mount
  useEffect(() => {
    connectAndRegister();
  }, [connectAndRegister]);

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
        </div>
        <div className="right-column">
          <LogsPanel logs={logs} />
          <section className="card config">
            <h2>Config</h2>
            <ul>
              <li>
                <span>Server:</span>
                <strong>{import.meta.env.VITE_SIP_SERVER}</strong>
              </li>
              <li>
                <span>User:</span>
                <strong>{import.meta.env.VITE_SIP_USERNAME}</strong>
              </li>
              <li>
                <span>Realm:</span>
                <strong>{import.meta.env.VITE_SIP_REALM}</strong>
              </li>
            </ul>
          </section>
        </div>
      </main>

      <audio ref={audioRef} autoPlay playsInline />
    </div>
  );
}

export default App;

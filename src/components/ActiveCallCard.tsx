import type { CallState } from "../types/sip.types";

interface ActiveCallCardProps {
  callState: CallState;
  peer: string | null;
  duration: string;
  canAnswer: boolean;
  canHangup: boolean;
  canHold: boolean;
  canMute: boolean;
  isOnHold: boolean;
  isMuted: boolean;
  onAnswer: () => void;
  onHangup: () => void;
  onToggleHold: () => void;
  onToggleMute: () => void;
}

export const ActiveCallCard = ({
  callState,
  peer,
  duration,
  canHold,
  canMute,
  isOnHold,
  isMuted,
  onAnswer,
  onHangup,
  onToggleHold,
  onToggleMute,
}: ActiveCallCardProps) => {
  const isIdle = callState === "idle";

  const getDirection = () => {
    if (isIdle) return "Call Session";
    if (callState === "incoming") return "Incoming Call";
    if (callState === "calling") return "Outgoing Call";
    return "Active Call";
  };

  const getStatusColor = () => {
    if (isIdle) return "#e2e8f0";
    if (callState === "incoming" || callState === "calling") return "#2563eb";
    if (callState === "held") return "#eab308";
    return "#16a34a";
  };

  return (
    <section className="card active-call-card" style={{ 
      borderLeft: `4px solid ${getStatusColor()}`,
      opacity: isIdle ? 0.6 : 1,
      transition: "all 0.3s ease"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {getDirection()}
          </span>
          <h2 style={{ margin: "4px 0 0", fontSize: "1.25rem", color: isIdle ? "#94a3b8" : "#1e293b" }}>
            {isIdle ? "Ready for call" : (peer || "Unknown")}
          </h2>
        </div>
        <div className="call-duration-badge" style={{ visibility: isIdle ? "hidden" : "visible" }}>
          {duration}
        </div>
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#64748b" }}>
        {!isIdle && <span className="pulse-icon" style={{ backgroundColor: getStatusColor() }}></span>}
        <span>{isIdle ? "Standby" : (callState.charAt(0).toUpperCase() + callState.slice(1))}</span>
      </div>

      <div className="call-actions" style={{ marginTop: "16px" }}>
        {callState === "incoming" ? (
          <>
            <button className="circle-btn answer" onClick={onAnswer} title="Answer">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
            <button className="circle-btn hangup" onClick={onHangup} title="Decline">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(135deg)" }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
          </>
        ) : (
          <button className="circle-btn hangup" onClick={onHangup} title="Hangup" disabled={isIdle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "rotate(135deg)" }}>
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        )}
        <button 
          className={`circle-btn hold ${isOnHold ? "active" : ""}`} 
          onClick={onToggleHold} 
          disabled={!canHold || isIdle || callState === "incoming"}
          title={isOnHold ? "Unhold" : "Hold"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>
        <button 
          className={`circle-btn mute ${isMuted ? "active" : ""}`} 
          onClick={onToggleMute} 
          disabled={!canMute || isIdle || callState === "incoming"}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>
      </div>
    </section>
  );
};

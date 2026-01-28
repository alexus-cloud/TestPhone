
interface AudioPanelProps {
  localAudioLevel: number;
  audioLevel: number;
  onTestSpeaker: () => Promise<void>;
  onLogDevices: () => Promise<any>;
  onReattachAudio: () => void;
  isCallActive: boolean;
}

export const AudioPanel = ({
  localAudioLevel,
  audioLevel,
  onTestSpeaker,
  onLogDevices,
  onReattachAudio,
  isCallActive,
}: AudioPanelProps) => {
  return (
    <section className="card audio-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0, fontSize: "1rem" }}>Audio Diagnostics</h2>
        <div className="debug-tools" style={{ display: "flex", gap: "8px" }}>
          <button 
            className="btn secondary small-btn" 
            onClick={onTestSpeaker}
            title="Test Speaker"
          >
            🔊 Test
          </button>
          <button 
            className="btn secondary small-btn" 
            onClick={onLogDevices}
            title="Log Devices"
          >
            📋 Devices
          </button>
        </div>
      </div>

      <div className="audio-monitors" style={{ display: "grid", gap: "16px" }}>
        <div className="monitor-group">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
            <span>Local Mic (Out)</span>
            <span>{Math.round(localAudioLevel)}</span>
          </div>
          <div className="level-bar-bg">
            <div 
              className="level-bar-fill"
              style={{ 
                width: `${Math.min(100, (localAudioLevel / 128) * 100)}%`, 
                background: localAudioLevel > 50 ? "#22c55e" : "#3b82f6" 
              }} 
            />
          </div>
        </div>

        <div className="monitor-group">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
            <span>Remote Audio (In)</span>
            <span>{Math.round(audioLevel)}</span>
          </div>
          <div className="level-bar-bg" onClick={onReattachAudio} style={{ cursor: "pointer" }} title="Click to re-attach audio">
            <div 
              className="level-bar-fill"
              style={{ 
                width: `${Math.min(100, (audioLevel / 128) * 100)}%`, 
                background: audioLevel > 50 ? "#22c55e" : "#3b82f6",
                boxShadow: audioLevel > 50 ? "0 0 8px rgba(34, 197, 94, 0.4)" : "none"
              }} 
            />
          </div>
        </div>

        {isCallActive && (
          <button 
            onClick={onReattachAudio} 
            className="btn ghost small-btn"
            style={{ width: "100%", fontSize: "0.75rem", padding: "8px" }}
          >
            🔄 Reset Audio Path
          </button>
        )}
      </div>
    </section>
  );
};

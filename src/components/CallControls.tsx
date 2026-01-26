interface CallControlsProps {
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

export const CallControls = ({
  canAnswer,
  canHangup,
  canHold,
  canMute,
  isOnHold,
  isMuted,
  onAnswer,
  onHangup,
  onToggleHold,
  onToggleMute,
}: CallControlsProps) => (
  <section className="card controls">
    <h2>Call Controls</h2>
    <div className="controls-grid">
      <button type="button" className="success" onClick={onAnswer} disabled={!canAnswer}>
        Answer
      </button>
      <button type="button" className="danger" onClick={onHangup} disabled={!canHangup}>
        Hangup
      </button>
      <button type="button" onClick={onToggleHold} disabled={!canHold}>
        {isOnHold ? "Unhold" : "Hold"}
      </button>
      <button type="button" onClick={onToggleMute} disabled={!canMute}>
        {isMuted ? "Unmute" : "Mute"}
      </button>
    </div>
  </section>
);

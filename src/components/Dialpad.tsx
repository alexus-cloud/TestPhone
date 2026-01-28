import { useMemo } from "react";

interface DialpadProps {
  value: string;
  onChange: (value: string) => void;
  onCall: () => void;
  disabled?: boolean;
}

const DIALPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export const Dialpad = ({ value, onChange, onCall, disabled }: DialpadProps) => {
  const canCall = useMemo(() => value.trim().length > 0 && !disabled, [value, disabled]);

  return (
    <section className="card dialpad">
      <h2 style={{ textAlign: "center", marginBottom: "16px" }}>Dialpad</h2>
      <div className="dialpad-input">
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="dialpad-grid">
        {DIALPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            className="dialpad-key"
            onClick={() => onChange(`${value}${key}`)}
            disabled={disabled}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="dialpad-actions">
        <div style={{ width: "56px", visibility: "hidden" }}></div>
        <button 
          className="circle-btn answer" 
          style={{ width: "56px", height: "56px" }}
          onClick={onCall} 
          disabled={!canCall}
          title="Call"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>
        <button 
          type="button" 
          className="circle-btn ghost"
          style={{ width: "56px", height: "56px" }}
          onClick={() => onChange(value.slice(0, -1))}
          disabled={disabled || !value}
          title="Backspace"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
            <line x1="18" y1="9" x2="12" y2="15"/>
            <line x1="12" y1="9" x2="18" y2="15"/>
          </svg>
        </button>
      </div>
    </section>
  );
};

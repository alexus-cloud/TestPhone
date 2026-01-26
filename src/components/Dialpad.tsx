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
      <h2>Dialpad</h2>
      <div className="dialpad-input">
        <input
          type="text"
          placeholder="Enter number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" onClick={() => onChange(value.slice(0, -1))}>
          ⌫
        </button>
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
      <button type="button" className="primary" onClick={onCall} disabled={!canCall}>
        Call
      </button>
    </section>
  );
};

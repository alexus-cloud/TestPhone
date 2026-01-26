import type { CallState, RegistrationStatus } from "../types/sip.types";

interface CallStatusProps {
  registrationStatus: RegistrationStatus;
  callState: CallState;
  peer?: string | null;
  duration: string;
}

export const CallStatus = ({ registrationStatus, callState, peer, duration }: CallStatusProps) => (
  <section className="card status">
    <h2>Status</h2>
    <div className="status-grid">
      <div>
        <span className="label">Registration</span>
        <strong>{registrationStatus}</strong>
      </div>
      <div>
        <span className="label">Call</span>
        <strong>{callState}</strong>
      </div>
      <div>
        <span className="label">Peer</span>
        <strong>{peer || "-"}</strong>
      </div>
      <div>
        <span className="label">Duration</span>
        <strong>{duration}</strong>
      </div>
    </div>
  </section>
);

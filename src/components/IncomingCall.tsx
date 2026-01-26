interface IncomingCallProps {
  from: string;
  onAnswer: () => void;
  onDecline: () => void;
}

export const IncomingCall = ({ from, onAnswer, onDecline }: IncomingCallProps) => (
  <section className="card incoming">
    <h2>Incoming Call</h2>
    <p>
      <strong>{from}</strong> is calling
    </p>
    <div className="incoming-actions">
      <button type="button" className="success" onClick={onAnswer}>
        Accept
      </button>
      <button type="button" className="danger" onClick={onDecline}>
        Decline
      </button>
    </div>
  </section>
);

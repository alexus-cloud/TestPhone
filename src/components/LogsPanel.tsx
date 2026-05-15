interface LogsPanelProps {
  title?: string;
  logs: string[];
}

export const LogsPanel = ({ title = "Logs", logs }: LogsPanelProps) => (
  <section className="card logs" style={{ marginBottom: "20px", minHeight: "400px" }}>
    <h2>{title}</h2>
    <div className="logs-content">
      {logs.length === 0 && <p>No logs yet</p>}
      {logs.map((log, index) => (
        <div key={`${log}-${index}`} className="log-line">
          {log}
        </div>
      ))}
    </div>
  </section>
);

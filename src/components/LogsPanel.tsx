interface LogsPanelProps {
  logs: string[];
}

export const LogsPanel = ({ logs }: LogsPanelProps) => (
  <section className="card logs">
    <h2>Logs</h2>
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

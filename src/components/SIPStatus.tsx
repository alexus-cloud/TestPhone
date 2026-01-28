import type { RegistrationStatus } from "../types/sip.types";

interface SIPStatusProps {
  status: RegistrationStatus;
  username?: string;
  server?: string;
  loginData?: any;
  onLoginDataChange?: (data: any) => void;
  onConnect?: () => void;
}

export const SIPStatus = ({ 
  status, 
  username, 
  server, 
  loginData, 
  onLoginDataChange, 
  onConnect 
}: SIPStatusProps) => {
  const getStatusColor = () => {
    switch (status) {
      case "registered":
        return "#22c55e"; // Green
      case "connecting":
        return "#eab308"; // Yellow
      case "error":
        return "#ef4444"; // Red
      default:
        return "#94a3b8"; // Gray
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case "registered":
        return "Registered";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Error";
      default:
        return "Disconnected";
    }
  };

  const isConnected = status === "registered";

  return (
    <section className="card sip-status-compact">
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: "0.95rem", color: "#64748b" }}>SIP Connection</h2>
          <div 
            className="status-indicator" 
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: getStatusColor(), textTransform: "uppercase", letterSpacing: "0.025em" }}>
              {getStatusLabel()}
            </span>
            <div 
              className="status-dot-pulse"
              style={{ 
                width: "10px", 
                height: "10px", 
                borderRadius: "50%", 
                backgroundColor: getStatusColor(),
                boxShadow: `0 0 0 0 ${getStatusColor()}`
              }} 
            />
          </div>
        </div>

        {isConnected ? (
          <div style={{ 
            borderTop: "1px solid #f1f5f9", 
            paddingTop: "12px",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "4px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span style={{ color: "#94a3b8" }}>User</span>
              <span style={{ fontWeight: 600, color: "#1e293b" }}>{username}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span style={{ color: "#94a3b8" }}>Server</span>
              <span style={{ fontWeight: 600, color: "#1e293b", opacity: 0.8 }}>{server?.replace(/^wss?:\/\//, "")}</span>
            </div>
          </div>
        ) : (
          <div style={{ 
            borderTop: "1px solid #f1f5f9", 
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            <input 
              className="compact-input"
              type="text" 
              placeholder="WSS Server" 
              value={loginData?.server || ""}
              onChange={(e) => onLoginDataChange?.({...loginData, server: e.target.value})}
              disabled={status === "connecting"}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input 
                className="compact-input"
                type="text" 
                placeholder="User" 
                value={loginData?.username || ""}
                onChange={(e) => onLoginDataChange?.({...loginData, username: e.target.value})}
                disabled={status === "connecting"}
              />
              <input 
                className="compact-input"
                type="password" 
                placeholder="Pass" 
                value={loginData?.password || ""}
                onChange={(e) => onLoginDataChange?.({...loginData, password: e.target.value})}
                disabled={status === "connecting"}
              />
            </div>
            <button 
              className="btn primary small-btn" 
              onClick={onConnect}
              disabled={status === "connecting" || !loginData?.server || !loginData?.username}
              style={{ width: "100%", marginTop: "4px" }}
            >
              {status === "connecting" ? "Connecting..." : "Register"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

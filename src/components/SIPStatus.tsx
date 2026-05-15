import type { RegistrationStatus } from "../types/sip.types";

interface SIPStatusProps {
  status: RegistrationStatus;
  apiStatus?: "disconnected" | "connecting" | "connected" | "error";
  username?: string;
  server?: string;
  loginData?: any;
  onLoginDataChange?: (data: any) => void;
  onConnect?: () => void;
}

export const SIPStatus = ({ 
  status, 
  apiStatus = "disconnected",
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

  const getApiStatusColor = () => {
    switch (apiStatus) {
      case "connected": return "#22c55e"; // Green
      case "connecting": return "#eab308"; // Yellow
      case "error": return "#ef4444"; // Red
      default: return "#94a3b8"; // Gray
    }
  };

  const getApiStatusLabel = () => {
    switch (apiStatus) {
      case "connected": return "Connected";
      case "connecting": return "Connecting...";
      case "error": return "Error";
      default: return "Disconnected";
    }
  };

  const isConnected = status === "registered";

  return (
    <section className="card sip-status-compact">
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: "0.95rem", color: "#64748b" }}>Connection</h2>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
            <div 
              className="status-indicator" 
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: getStatusColor(), textTransform: "uppercase", letterSpacing: "0.025em" }}>
                SIP: {getStatusLabel()}
              </span>
              <div 
                className="status-dot-pulse"
                style={{ 
                  width: "8px", 
                  height: "8px", 
                  borderRadius: "50%", 
                  backgroundColor: getStatusColor(),
                  boxShadow: `0 0 0 0 ${getStatusColor()}`
                }} 
              />
            </div>
            <div 
              className="status-indicator" 
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: getApiStatusColor(), textTransform: "uppercase", letterSpacing: "0.025em" }}>
                API: {getApiStatusLabel()}
              </span>
              <div 
                className="status-dot-pulse"
                style={{ 
                  width: "8px", 
                  height: "8px", 
                  borderRadius: "50%", 
                  backgroundColor: getApiStatusColor(),
                  boxShadow: `0 0 0 0 ${getApiStatusColor()}`
                }} 
              />
            </div>
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
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (loginData?.domain && loginData?.username && loginData?.password && status !== "connecting") {
                onConnect?.();
              }
            }}
            style={{ 
            borderTop: "1px solid #f1f5f9", 
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            <input 
              id="sip-domain"
              name="domain"
              autoComplete="organization"
              className="compact-input"
              type="text" 
              placeholder="Domain" 
              value={loginData?.domain || ""}
              onChange={(e) => onLoginDataChange?.({...loginData, domain: e.target.value})}
              disabled={status === "connecting"}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <input 
                id="sip-username"
                name="username"
                autoComplete="username"
                className="compact-input"
                type="text" 
                placeholder="Extension" 
                value={loginData?.username || ""}
                onChange={(e) => onLoginDataChange?.({...loginData, username: e.target.value})}
                disabled={status === "connecting"}
              />
              <input 
                id="sip-password"
                name="password"
                autoComplete="current-password"
                className="compact-input"
                type="password" 
                placeholder="Password" 
                value={loginData?.password || ""}
                onChange={(e) => onLoginDataChange?.({...loginData, password: e.target.value})}
                disabled={status === "connecting"}
              />
            </div>
            <button 
              type="submit"
              className="btn primary small-btn" 
              disabled={status === "connecting" || !loginData?.domain || !loginData?.username || !loginData?.password}
              style={{ width: "100%", marginTop: "4px" }}
            >
              {status === "connecting" ? "Connecting..." : "Login"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

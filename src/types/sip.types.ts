export type RegistrationStatus = "disconnected" | "connecting" | "registered" | "error";

export type CallState = "idle" | "calling" | "incoming" | "active" | "held";

export interface IncomingCallInfo {
  from: string;
}

export interface SipConfig {
  server: string;
  username: string;
  password: string;
  realm: string;
}

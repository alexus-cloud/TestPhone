/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SIP_SERVER: string;
  readonly VITE_SIP_USERNAME: string;
  readonly VITE_SIP_PASSWORD: string;
  readonly VITE_SIP_REALM: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

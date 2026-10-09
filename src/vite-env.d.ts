/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Full URL of the deployed server (server.ts). Required in the Android app, which has no server of its own. */
  readonly VITE_API_BASE_URL?: string;
}

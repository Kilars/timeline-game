/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * The API address, set at build time, such as `http://localhost:8787`. Without it the client
   * plays the bundled fixture decks.
   */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

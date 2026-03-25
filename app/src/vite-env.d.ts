/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_QQ_APP_ID?: string;
  readonly VITE_QQ_APP_KEY?: string;
  readonly VITE_QQ_BASE_URL?: string;
  readonly VITE_QQ_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * React App type declarations
 */

/// <reference types="react-scripts" />

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_API_BASE_URL: string;
    REACT_APP_NAME: string;
    REACT_APP_VERSION: string;
  }
}

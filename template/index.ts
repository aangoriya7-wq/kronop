// @ts-nocheck
export { configManager, createConfig } from './core';
export { getSharedDatabaseClient, safeDatabaseOperation } from './core';
export * from './auth';

// UI exports
export { useAlert, AlertProvider } from './ui';
export type { AlertButton, AlertState } from './ui';

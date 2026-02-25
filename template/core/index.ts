// @ts-nocheck
// Simplified Core module exports
export * from './types';
export { configManager, createConfig } from './config';
export { 
  getSharedDatabaseClient, 
  getSharedDatabaseClient as getDatabaseClient,
  safeDatabaseOperation 
} from './client';
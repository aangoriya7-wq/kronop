// @ts-nocheck
import { OnSpaceConfig } from './types';

export interface CreateConfigOptions {
  auth?: {
    enabled?: boolean;
    profileTableName?: string;
  } | false;
  supabase?: {
    url?: string;
    anonKey?: string;
  };
}

export interface SupabaseConfig extends OnSpaceConfig {
  auth?: {
    enabled?: boolean;
    profileTableName?: string;
  } | false;
  supabase?: {
    url?: string;
    anonKey?: string;
  };
}

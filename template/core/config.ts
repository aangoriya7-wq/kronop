// @ts-nocheck
import { OnSpaceConfig } from './types';

class ConfigManager {
  private static instance: ConfigManager;
  private config: OnSpaceConfig | null = null;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public initialize(config: OnSpaceConfig) {
    if (this.config) {
      console.warn('[Template:Config] Configuration already set, updating...');
    }
    
    this.config = { ...config };
  }

  public getConfig(): OnSpaceConfig {
    if (!this.config) {
      this.config = this.createDefaultConfig();
    }
    return { ...this.config };
  }

  private createDefaultConfig(): OnSpaceConfig {
    // MongoDB-based configuration - no Supabase
    return {
      auth: {
        enabled: true,
        profileTableName: 'user_profiles',
      },
      payments: false,
      storage: false,
    };
  }

  public getModuleConfig<T = any>(moduleName: string): T | null {
    const config = this.getConfig();
    return (config as any)[moduleName] || null;
  }

  public isModuleEnabled(moduleName: string): boolean {
    const moduleConfig = this.getModuleConfig(moduleName);
    return moduleConfig !== false && moduleConfig !== null;
  }


  public updateConfig(updates: Partial<OnSpaceConfig>) {
    const config = this.getConfig();
    this.config = { ...config, ...updates };
  }
}

export const configManager = ConfigManager.getInstance();

interface CreateConfigOptions {
  auth?: {
    enabled?: boolean;
    profileTableName?: string;
  } | false;
}

export const createConfig = (options: CreateConfigOptions = {}): OnSpaceConfig => {
  let authConfig;
  if (options.auth === false) {
    authConfig = false;
  } else if (options.auth === undefined) {
    authConfig = {
      enabled: true,
      profileTableName: 'user_profiles',
    };
  } else if (typeof options.auth === 'object') {
    authConfig = {
      enabled: true,
      profileTableName: 'user_profiles',
      ...options.auth,
    };
  }

  return {
    auth: authConfig,
    payments: false,
    storage: false,
  };
};
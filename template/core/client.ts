// @ts-nocheck
// Simple client-side database manager (no direct DB connections)
// Uses API calls instead of direct MongoDB connections

class DatabaseManager {
  private static instance: DatabaseManager | null = null;
  private static creating = false;
  private static creationCount = 0;

  static getClient(): DatabaseManager {
    if (this.instance) {
      return this.instance;
    }

    if (this.creating) {
      throw new Error('[Template:Client] Database client is being created, please wait');
    }

    this.creating = true;
    this.creationCount++;
    
    try {
      console.log(`[Template:Client] Creating API client instance #${this.creationCount}`);
      
      if (this.creationCount > 1) {
        console.warn(`[Template:Client] ⚠️ Multiple client creation detected! This is creation #${this.creationCount}`);
        console.warn('[Template:Client] This may indicate a development environment hot reload or architecture issue.');
      }
      
      this.instance = new DatabaseManager();
      console.log('[Template:Client] API client created successfully');
      return this.instance;
      
    } finally {
      this.creating = false;
    }
  }

  // This will be replaced with API calls
  async getDatabase() {
    console.log('[Template:Client] Database operations will be handled via API calls');
    return null;
  }
}

export const getSharedDatabaseClient = (): DatabaseManager => {
  return DatabaseManager.getClient();
};

export const safeDatabaseOperation = async <T>(
  operation: (client: DatabaseManager) => Promise<T>
): Promise<T> => {
  const client = getSharedDatabaseClient();
  return await operation(client);
};

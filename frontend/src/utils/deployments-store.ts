import { supabase } from '@/utils/supabase/supabase';

export interface DeploymentStatus {
  id: string;
  status: 'pending' | 'in-progress' | 'complete' | 'error';
  url?: any;
  error?: string;
  message?: any;
  tmpdir?: string; // Changed to lowercase to match PostgreSQL convention
  createdat: number;
  log?: any;
  server_id?: string; // Optional server_id for linking with a specific server
}

// Table name in Supabase for deployment status data
const DEPLOYMENT_STATUS_TABLE = 'deployment_status';

// Store deployment statuses in Supabase with in-memory cache
class DeploymentsStore {
  private static instance: DeploymentsStore;
  // Cache for quick lookups
  private cache = new Map<string, DeploymentStatus>();
  
  // Prevent multiple instances 
  private constructor() {
    this.startCleanupInterval();
    this.initializeCache();
  }
  
  public static getInstance(): DeploymentsStore {
    if (!DeploymentsStore.instance) {
      DeploymentsStore.instance = new DeploymentsStore();
    }
    return DeploymentsStore.instance;
  }
  // Initialize cache from Supabase
  private async initializeCache(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from(DEPLOYMENT_STATUS_TABLE)
        .select('*');
      
      if (error) {
        console.error('Error initializing deployment status cache:', error);
        return;
      }
      
      if (data) {
        data.forEach((item) => {
          this.cache.set(item.id, {
            ...item,
            createdat: new Date(item.createdat).getTime()
          });
        });
      }
    } catch (error) {
      console.error('Failed to initialize deployment cache:', error);
    }
  }
    public async get(id: string): Promise<DeploymentStatus | undefined> {
    // Check cache first
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    
    // If not in cache, try to get from Supabase
    try {
      const { data, error } = await supabase
        .from(DEPLOYMENT_STATUS_TABLE)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error(`Error fetching deployment status for ID ${id}:`, error);
        return undefined;
      }
      
      if (data) {
        const status: DeploymentStatus = {
          ...data,
          createdat: new Date(data.createdat).getTime()
        };
        
        // Update cache
        this.cache.set(id, status);
        return status;
      }
      
      return undefined;
    } catch (error) {
      console.error(`Failed to get deployment status for ID ${id}:`, error);
      return undefined;
    }
  }
    public async set(id: string, status: DeploymentStatus): Promise<void> {
      // Update cache
      this.cache.set(id, status);

      // Check if the record exists
      const exists = this.cache.has(id);

      try {
        if (exists) {
          // Update (upsert) if exists
          const { error } = await supabase
            .from(DEPLOYMENT_STATUS_TABLE)
            .upsert({
              id,
              status: status.status,
              url: status.url,
              error: status.error,
              message: status.message,
              tmpdir: status.tmpdir || null,
              createdat: new Date(status.createdat).toISOString(),
              log: status.log,
              server_id: status.server_id
            });

          if (error) {
            console.error(`Error updating deployment status for ID ${id}:`, error);
          }
        } else {
          // Insert if not exists
          const { error } = await supabase
            .from(DEPLOYMENT_STATUS_TABLE)
            .insert({
              id,
              status: status.status,
              url: status.url,
              error: status.error,
              message: status.message,
              tmpdir: status.tmpdir || null,
              createdat: new Date(status.createdat).toISOString(),
              log: status.log,
              server_id: status.server_id
            });

          if (error) {
            console.error(`Error inserting deployment status for ID ${id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Failed to save deployment status for ID ${id}:`, error);
      }
    }
  
  public async delete(id: string): Promise<boolean> {
    // Remove from cache
    this.cache.delete(id);
    
    // Remove from Supabase
    try {
      const { error } = await supabase
        .from(DEPLOYMENT_STATUS_TABLE)
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(`Error deleting deployment status for ID ${id}:`, error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to delete deployment status for ID ${id}:`, error);
      return false;
    }
  }
  
  public has(id: string): boolean {
    return this.cache.has(id);
  }
    // Clean up old deployments every 10 minutes
  private startCleanupInterval() {
    const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes
    const MAX_AGE = 30 * 60 * 1000; // 30 minutes
    
    setInterval(async () => {
      const now = Date.now();
      const cutoffDate = new Date(now - MAX_AGE).toISOString();
      
      // Clean up cache
      this.cache.forEach((deployment, id) => {
        if (now - deployment.createdat > MAX_AGE) {
          this.cache.delete(id);
        }
      });
      
      // Clean up Supabase
      try {
        const { error } = await supabase
          .from(DEPLOYMENT_STATUS_TABLE)
          .delete()
          .lt('createdat', cutoffDate);
        
        if (error) {
          console.error('Error cleaning up old deployment statuses:', error);
        }
      } catch (error) {
        console.error('Failed to clean up old deployment statuses:', error);
      }
    }, CLEANUP_INTERVAL);
  }
}

// Export the singleton instance
export const deployments = DeploymentsStore.getInstance();

// Helper function to create new deployment status
export function createDeploymentStatus(id: string, server_id?: string): DeploymentStatus {
  return {
    id,
    status: 'pending',
    message: 'Preparing deployment',
    createdat: Date.now(),
    server_id
  };
}

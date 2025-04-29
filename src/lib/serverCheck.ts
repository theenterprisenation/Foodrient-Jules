import { supabase } from './supabase';

interface ServerHealthResult {
  healthy: boolean;
  responseTime?: number;
  error?: string;
  version?: string;
}

// Check the health of the Supabase auth endpoint
export const checkAuthEndpointHealth = async (): Promise<ServerHealthResult> => {
  try {
    const startTime = Date.now();
    
    // Try to get the session as a simple health check
    const { error } = await supabase.auth.getSession();
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        healthy: false,
        responseTime,
        error: error.message
      };
    }
    
    // If response time is too high, consider the service unhealthy
    if (responseTime > 5000) {
      return {
        healthy: false,
        responseTime,
        error: 'Auth endpoint response time is too high'
      };
    }
    
    return {
      healthy: true,
      responseTime
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message
    };
  }
};

// Check the health of the Supabase database
export const checkDatabaseHealth = async (): Promise<ServerHealthResult> => {
  try {
    const startTime = Date.now();
    
    // Simple query to check database health
    const { error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      return {
        healthy: false,
        responseTime,
        error: error.message
      };
    }
    
    // If response time is too high, consider the service unhealthy
    if (responseTime > 5000) {
      return {
        healthy: false,
        responseTime,
        error: 'Database response time is too high'
      };
    }
    
    return {
      healthy: true,
      responseTime
    };
  } catch (error: any) {
    return {
      healthy: false,
      error: error.message
    };
  }
};

// Check overall server health
export const checkServerHealth = async (): Promise<{
  auth: ServerHealthResult;
  database: ServerHealthResult;
  healthy: boolean;
}> => {
  const auth = await checkAuthEndpointHealth();
  const database = await checkDatabaseHealth();
  
  return {
    auth,
    database,
    healthy: auth.healthy && database.healthy
  };
};
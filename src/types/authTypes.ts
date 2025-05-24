export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthState {
  user: any | null;
  status: AuthStatus;
  error: string | null;
  serverStatus: 'unknown' | 'healthy' | 'unhealthy';
  sessionChecksum: string | null;
}

export interface AuthContextType {
  user: any | null;
  status: AuthStatus;
  error: string | null;
  serverStatus: 'unknown' | 'healthy' | 'unhealthy';
  retryAuth: () => Promise<void>;
  sessionChecksum: string | null;
  validateSession: () => Promise<boolean>;
}

// Extend String prototype for fallback hashing
declare global {
  interface String {
    hashCode(): number;
  }
}
import { useAuth } from './AuthProvider';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { handleAuthError } from '../utils/auth-helpers';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Error caught by ErrorBoundary:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    this.setState({
      errorInfo
    });
    
    // Log to monitoring service if available
    // logErrorToService(error, errorInfo);
  }
  
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if it's an auth error
      const errorMessage = this.state.error ? handleAuthError(this.state.error) : 'An unexpected error occurred';
      
      // Custom fallback UI
      return this.props.fallback || (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
            <div className="flex items-center text-red-600 mb-4">
              <AlertCircle className="h-6 w-6 mr-2" />
              <h2 className="text-xl font-semibold">Something went wrong</h2>
            </div>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            
            {this.state.errorInfo && (
              <div className="mb-6">
                <details className="text-xs text-gray-500 mt-2">
                  <summary className="cursor-pointer text-sm text-gray-700 mb-2">Technical Details</summary>
                  <pre className="whitespace-pre-wrap bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {this.state.error && this.state.error.toString()}
                    <br />
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AlertCircle, ArrowLeft, ShoppingBag, Eye, EyeOff, Loader, WifiOff, RefreshCw } from 'lucide-react';
import { handleAuthError } from '../utils/auth-helpers';
import { NetworkMonitor } from '../utils/networkMonitor';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'timeout' | 'error' | 'success'>('idle');
  const [retryCount, setRetryCount] = useState(0);
  const { user, signIn, signUp, resetPassword } = useAuthStore();
  const location = useLocation();
  const [loginTimeout, setLoginTimeout] = useState<NodeJS.Timeout | null>(null);

  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasAttemptedRedirect = useRef(false);

  // Reset error when switching forms
  useEffect(() => {
    setError('');
    setSuccessMessage('');
    setStatus('idle');
    setRetryCount(0);
  }, [isLogin, isForgotPassword]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (loginTimeout) {
        clearTimeout(loginTimeout);
      }
    };
  }, [loginTimeout]);

  const checkNetworkConnectivity = () => {
    return NetworkMonitor.getInstance().isOnline();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setStatus('loading');

    // Check network connectivity first
    if (!checkNetworkConnectivity()) {
      setError('No internet connection. Please check your network and try again.');
      setStatus('error');
      return;
    }

    setIsSubmitting(true);

    // Set a timeout to prevent hanging indefinitely - increased to 20 seconds
    const timeout = setTimeout(() => {
      setError('The request is taking longer than expected. Please check your connection and try again.');
      setStatus('timeout');
      setRetryCount(prev => prev + 1);
      setIsSubmitting(false);
    }, 25000); // 25 seconds timeout
    
    setLoginTimeout(timeout);

    try {
      if (isForgotPassword) {
        await resetPassword(email);
        setSuccessMessage('Password reset instructions have been sent to your email.');
        setStatus('success');
        clearTimeout(timeout);
        setLoginTimeout(null);
        return;
      }

      if (isLogin) {
        await signIn(email, password);
        setStatus('success');
        // Redirect will be handled by auth state change handler
      } else {
        await signUp(email, password);
        setSuccessMessage('Account created successfully! Please check your email to verify your account.');
        setStatus('success');
      }
    } catch (err) {
      setError(handleAuthError(err));
      setStatus(err.message?.includes('timed out') ? 'timeout' : 'error');
      console.error('Auth error:', err);
    } finally {
      if (loginTimeout) {
        clearTimeout(loginTimeout);
        setLoginTimeout(null);
      }
      setIsSubmitting(false);
    }
  };

  const renderForgotPassword = () => (
    <div className="w-full max-w-sm mx-auto px-4 sm:px-0">
      <div className="flex justify-center mb-6">
        <ShoppingBag className="h-12 w-12 text-yellow-500" />
      </div>
      <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
        Reset your password
      </h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        Enter your email address and we'll send you instructions to reset your password.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 text-sm"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {error && (
          <div className="text-red-600 text-sm flex items-center bg-red-50 p-3 rounded-md">
            {!checkNetworkConnectivity() && <WifiOff className="h-4 w-4 mr-1 flex-shrink-0" />}
            {checkNetworkConnectivity() && <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />}
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
            {successMessage}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setIsForgotPassword(false)}
            className="flex items-center text-sm text-yellow-600 hover:text-yellow-500"
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to sign in
          </button>
          <button
            type="submit"
            className="w-32 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : 'Send email'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderAuthForm = () => (
    <div className="w-full max-w-sm mx-auto px-4 sm:px-0">
      <div className="flex justify-center mb-6">
        <ShoppingBag className="h-12 w-12 text-yellow-500" />
      </div>
      <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
        {isLogin ? 'Welcome back' : 'Create your account'}
      </h2>
      <p className="mt-2 text-center text-sm text-gray-600">
        {isLogin ? 'Sign in to your account' : 'Join Foodrient today'}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email address
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 text-sm"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <div className="mt-1 relative">
            <input
              id="password"
              name="password"
              id="password"
              name="password"
              id="password"
              name="password"
              autoComplete="current-password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 text-sm pr-10"
              disabled={isSubmitting}
            />
            <button
              type="button"
              id="toggle-password-visibility"
              aria-label={showPassword ? "Hide password" : "Show password"}
              id="toggle-password-visibility"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-500" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {status === 'timeout' && (
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />
              <p className="text-sm text-yellow-700">
                Connection is slower than usual. {retryCount > 0 && `Retry #${retryCount}`}
              </p>
            </div>
            <div className="mt-3 flex space-x-3">
              <button
                type="submit"
                className="flex items-center text-sm bg-yellow-500 text-white px-3 py-1.5 rounded-md hover:bg-yellow-600"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Try Again
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('idle');
                  setError('');
                }}
                className="text-sm text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm flex items-center bg-red-50 p-3 rounded-md">
            {!checkNetworkConnectivity() && <WifiOff className="h-4 w-4 mr-1 flex-shrink-0" />}
            {checkNetworkConnectivity() && <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />}
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
            {successMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Please wait...
            </span>
          ) : (
            isLogin ? 'Sign in' : 'Sign up'
          )}
        </button>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-yellow-600 hover:text-yellow-500"
            disabled={isSubmitting}
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>
          {isLogin && (
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="text-sm text-yellow-600 hover:text-yellow-500"
              disabled={isSubmitting}
            >
              Forgot password?
            </button>
          )}
        </div>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12">
      {isForgotPassword ? renderForgotPassword() : renderAuthForm()}
    </div>
  );
};

export default Auth;
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, Upload, AlertCircle, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { 
  Settings, 
  Save, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Key, 
  Shield,
  Lock,
  CreditCard,
  Bell,
  Plus
} from 'lucide-react';

const VendorSignup = () => {
  const navigate = useNavigate();
  const { signUp } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [resendButtonDisabled, setResendButtonDisabled] = useState(true);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [resendError, setResendError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessAddress: '',
    state: '',
    city: '',
    utilityBill: null as File | null,
    nationalId: null as File | null,
    acceptTerms: false
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'utilityBill' | 'nationalId') => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      // Validate file type
      if (!['image/png', 'image/jpeg', 'application/pdf'].includes(file.type)) {
        setError('File must be PNG, JPG, or PDF');
        return;
      }
      setFormData({ ...formData, [field]: file });
    }
  };

  const handleResendVerificationEmail = async () => {
    setResendError(null);
    setResendButtonDisabled(true);
    setResendCountdown(60);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
      });
      
      if (error) throw error;
      
      setSuccessMessage('Verification email resent successfully! Please check your inbox.');
      
      // Start countdown timer
      const countdownInterval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setResendButtonDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error: any) {
      setResendError(error.message || 'Failed to resend verification email. Please try again.');
      setResendButtonDisabled(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResendError(null);
    setIsLoading(true);

    try {
      // Validate passwords match
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Validate terms acceptance
      if (!formData.acceptTerms) {
        throw new Error('Please accept the vendor terms and conditions');
      }

      // Sign up user with vendor role
      await signUp(formData.email, formData.password, 'vendor');

      // Set email sent state to true
      setEmailSent(true);
      
      // Start countdown timer for resend button
      const countdownInterval = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            setResendButtonDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setSuccessMessage('Account created successfully! Please check your email to verify your account.');
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error.message.includes('Password should be')) {
        errorMessage = 'Password must be at least 6 characters long.';
      } else if (error.message.includes('already registered')) {
        errorMessage = 'This email is already registered. Please sign in or use a different email.';
      }
      else if (error.message.includes('Email link is invalid or has expired')) {
        errorMessage = 'The verification link is invalid or has expired. Please request a new verification email.';
      }

      setError(errorMessage);
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <Store className="h-12 w-12 text-yellow-500" />
            <h1 className="ml-3 text-3xl font-bold text-gray-900">Vendor Sign Up</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Personal Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Information</h2>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">Business/Trade Name</label>
                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700">Business Address</label>
                  <input
                    id="businessAddress"
                    name="businessAddress"
                    type="text"
                    required
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">State</label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Documents</h2>
              <div className="space-y-6">
                <div>
                  <label htmlFor="utilityBill" className="block text-sm font-medium text-gray-700">Recent Utility Bill</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="utilityBill" className="relative cursor-pointer bg-white rounded-md font-medium text-yellow-600 hover:text-yellow-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-yellow-500">
                          <span>Upload a file</span>
                          <input
                            id="utilityBill"
                            name="utilityBill"
                            type="file"
                            required
                            className="sr-only"
                            accept=".png,.jpg,.jpeg,.pdf"
                            onChange={(e) => handleFileChange(e, 'utilityBill')}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700">Valid National ID</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="nationalId" className="relative cursor-pointer bg-white rounded-md font-medium text-yellow-600 hover:text-yellow-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-yellow-500">
                          <span>Upload a file</span>
                          <input
                            id="nationalId"
                            name="nationalId"
                            type="file"
                            required
                            className="sr-only"
                            accept=".png,.jpg,.jpeg,.pdf"
                            onChange={(e) => handleFileChange(e, 'nationalId')}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="acceptTerms" className="font-medium text-gray-700">
                  I accept the <Link to="/vendor-terms" target="_blank" className="text-yellow-600 hover:text-yellow-700 underline">Vendor Terms and Conditions</Link>
                </label>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 mt-2">
              Please review our <Link to="/vendor-terms" target="_blank" className="text-yellow-600 hover:text-yellow-700">Vendor Terms and Conditions</Link> before signing up.
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{successMessage}</p>
                  </div>
                </div>
                {emailSent && (
                  <div className="mt-3 w-full">
                    <button
                      type="button"
                      onClick={handleResendVerificationEmail}
                      disabled={resendButtonDisabled}
                      className={`mt-2 flex items-center text-sm ${
                        resendButtonDisabled 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-yellow-600 hover:text-yellow-700'
                      }`}
                    >
                      {resendButtonDisabled ? (
                        <>
                          <Clock className="h-4 w-4 mr-1" />
                          Resend verification email ({resendCountdown}s)
                        </>
                      ) : (
                        'Resend verification email'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          
          {/* Resend Error Message */}
          {resendError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{resendError}</h3>
                </div>
              </div>
            </div>
          )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Create Vendor Account'}
              </button>
            </div>
            
            {/* Login Link */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/auth" className="font-medium text-yellow-600 hover:text-yellow-500">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorSignup;
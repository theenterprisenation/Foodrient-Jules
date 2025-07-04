import React, { useState, useEffect } from 'react';
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
  Store,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

const VendorSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [profile, setProfile] = useState({
    id: '',
    full_name: '',
    email: '',
    phone_number: '',
    address: ''
  });
  
  const [vendorProfile, setVendorProfile] = useState({
    id: '',
    business_name: '',
    description: '',
    logo_url: '',
    contact_email: '',
    contact_phone: '',
    account_name: '', // Added
    account_number: '', // Added
    bank_name: '' // Added
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const user = useAuthStore(state => state.user);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  const fetchProfiles = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, address, email')
        .eq('id', user.id)
        .maybeSingle();
        
      if (profileError) throw profileError;
      
      // Set profile data
      setProfile({
        id: user.id,
        full_name: profileData?.full_name || '',
        email: profileData?.email || user.email || '',
        phone_number: profileData?.phone_number || '',
        address: profileData?.address || ''
      });

      // Try to fetch vendor profile
      let vendorData = null;
      try {
        const { data, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (vendorError && vendorError.code !== '42501') throw vendorError;
        
        vendorData = data;
      } catch (vendorFetchError) {
        console.log('Vendor profile fetch failed, will attempt to create one');
      }

      // Set vendor profile data if available
      if (vendorData) {
        setVendorProfile({
          id: vendorData.id,
          business_name: vendorData.business_name || '',
          description: vendorData.description || '',
          logo_url: vendorData.logo_url || '',
          contact_email: vendorData.contact_email || profileData?.email || user.email || '',
          contact_phone: vendorData.contact_phone || profileData?.phone_number || '',
          account_name: vendorData.account_name || '', // Added
          account_number: vendorData.account_number || '', // Added
          bank_name: vendorData.bank_name || '' // Added
        });
      } else {
        // Initialize empty vendor profile
        setVendorProfile({
          id: '',
          business_name: '',
          description: '',
          logo_url: '',
          contact_email: profileData?.email || user.email || '',
          contact_phone: profileData?.phone_number || '',
          account_name: '', // Added
          account_number: '', // Added
          bank_name: '' // Added
        });
      }
    } catch (error: any) {
      console.error('Error fetching profiles:', error);
      setError(error.message || 'Failed to load profile data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      if (!user) throw new Error('User not authenticated');
      
      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: profile.id,
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          address: profile.address,
          updated_at: new Date().toISOString()
        });
        
      if (profileError) throw profileError;
      
      // Prepare vendor data
      const vendorData = {
        user_id: user.id,
        business_name: vendorProfile.business_name,
        description: vendorProfile.description,
        logo_url: vendorProfile.logo_url,
        contact_email: vendorProfile.contact_email,
        contact_phone: vendorProfile.contact_phone,
        account_name: vendorProfile.account_name, // Added
        account_number: vendorProfile.account_number, // Added
        bank_name: vendorProfile.bank_name, // Added
        updated_at: new Date().toISOString()
      };

      // Try to update existing vendor profile first
      if (vendorProfile.id) {
        const { error: vendorError } = await supabase
          .from('vendors')
          .update(vendorData)
          .eq('id', vendorProfile.id);
          
        if (vendorError && vendorError.code !== '42501') throw vendorError;
      }

      // If update failed or no vendor profile exists, try to create one
      if (!vendorProfile.id) {
        try {
          const { data: newVendor, error: createError } = await supabase
            .from('vendors')
            .insert(vendorData)
            .select()
            .single();
            
          if (createError) throw createError;
          
          if (newVendor) {
            setVendorProfile(prev => ({
              ...prev,
              id: newVendor.id
            }));
          }
        } catch (createError: any) {
          if (createError.code === '42501') {
            console.warn('User not authorized to create vendor profile');
            // Continue without setting an error since we can still work with local state
          } else {
            throw createError;
          }
        }
      }
      
      setSuccessMessage('Profile updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match');
      }
      
      if (passwordData.newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      setSuccessMessage('Password updated successfully');
      setIsChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setError(error.message || 'Failed to change password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 text-yellow-500 animate-spin" />
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center text-green-800">
          <CheckCircle className="h-5 w-5 mr-2" />
          <p>{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
              {vendorProfile.logo_url ? (
                <img 
                  src={vendorProfile.logo_url} 
                  alt={vendorProfile.business_name} 
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <Store className="h-12 w-12 text-yellow-600" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {vendorProfile.business_name || 'Your Business'}
            </h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              Vendor
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-5 w-5 mr-3 text-gray-400" />
              {profile.email || 'No email'}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-5 w-5 mr-3 text-gray-400" />
              {profile.phone_number || 'No phone number'}
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-5 w-5 mr-3 text-gray-400" />
              {profile.address || 'No address'}
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setIsChangingPassword(true)}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Key className="h-5 w-5 mr-2" />
              Change Password
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {isChangingPassword ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Change Password</h2>
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    required
                    minLength={6}
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5 mr-2" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Personal Information</h2>
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Email address cannot be changed. Contact support if you need to update your email.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                      type="tel"
                      value={profile.phone_number}
                      onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <textarea
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    ></textarea>
                  </div>
                  
                  <h2 className="text-lg font-medium text-gray-900 pt-4 mb-4">Business Information</h2>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Name</label>
                    <input
                      type="text"
                      value={vendorProfile.business_name}
                      onChange={(e) => setVendorProfile({ ...vendorProfile, business_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Description</label>
                    <textarea
                      value={vendorProfile.description}
                      onChange={(e) => setVendorProfile({ ...vendorProfile, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                    <div className="mt-1 flex items-center">
                      <input
                        type="url"
                        value={vendorProfile.logo_url}
                        onChange={(e) => setVendorProfile({ ...vendorProfile, logo_url: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                        placeholder="https://example.com/logo.jpg"
                      />
                      <ImageIcon className="h-5 w-5 text-gray-400 ml-2" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Email</label>
                    <input
                      type="email"
                      value={vendorProfile.contact_email}
                      onChange={(e) => setVendorProfile({ ...vendorProfile, contact_email: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Phone</label>
                    <input
                      type="tel"
                      value={vendorProfile.contact_phone}
                      onChange={(e) => setVendorProfile({ ...vendorProfile, contact_phone: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>

                  {/* Bank Account Details Section */}
                  <h3 className="text-md font-semibold text-gray-800 pt-6 pb-2 border-b border-gray-200">Bank Account Details</h3>
                  <p className="mt-1 text-xs text-gray-500 mb-4">
                    Provide your bank account details for payouts. This information is kept secure.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Account Name</label>
                    <input
                      type="text"
                      value={vendorProfile.account_name}
                      onChange={(e) => setVendorProfile({ ...vendorProfile, account_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                      placeholder="e.g., Your Business Name Ltd."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Account Number</label>
                    <input
                      type="text"
                      value={vendorProfile.account_number}
                      onChange={(e) => setVendorProfile({ ...vendorProfile, account_number: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                      placeholder="e.g., 1234567890"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <input
                      type="text"
                      value={vendorProfile.bank_name}
                      onChange={(e) => setVendorProfile({ ...vendorProfile, bank_name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                      placeholder="e.g., Global Trust Bank"
                    />
                  </div>
                  
                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Security</h2>
                <div className="flex items-start mb-4">
                  <div className="flex-shrink-0 mt-0.5">
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">Account Security</h3>
                    <p className="text-sm text-gray-500">
                      Protect your account by using a strong password and enabling two-factor authentication if available.
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-0.5">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">Password</h3>
                    <p className="text-sm text-gray-500">
                      It's a good idea to use a strong password that you don't use elsewhere.
                    </p>
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      className="mt-2 text-sm text-yellow-600 hover:text-yellow-700"
                    >
                      Change password
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorSettings;
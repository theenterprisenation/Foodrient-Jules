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
  Lock,
  CreditCard,
  Bell,
  Plus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const CustomerSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'payment'>('profile');
  
  const [profile, setProfile] = useState({
    id: '',
    full_name: '',
    email: '',
    phone_number: '',
    address: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    email_order_updates: true,
    email_promotions: true,
    email_group_buy_updates: true,
    push_order_updates: true,
    push_promotions: false,
    push_group_buy_updates: true
  });
  
  const [paymentMethods, setPaymentMethods] = useState([
    {
      id: '1',
      type: 'card',
      last4: '4242',
      expiry: '12/25',
      isDefault: true
    }
  ]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, address')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      setProfile({
        id: user.id,
        full_name: profileData?.full_name || '',
        email: user.email || '',
        phone_number: profileData?.phone_number || '',
        address: profileData?.address || ''
      });
      
      // In a real app, we would fetch notification settings and payment methods here
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          address: profile.address
        })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      setSuccessMessage('Profile updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      // Validate passwords
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match');
      }
      
      if (passwordData.newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      setSuccessMessage('Password updated successfully');
      setIsChangingPassword(false);
      
      // Reset password fields
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      // In a real app, we would update notification settings in the database
      setSuccessMessage('Notification preferences updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      setError('Failed to update notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePaymentMethod = (id: string) => {
    // In a real app, we would remove the payment method from the database
    setPaymentMethods(paymentMethods.filter(method => method.id !== id));
    setSuccessMessage('Payment method removed successfully');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleSetDefaultPaymentMethod = (id: string) => {
    // In a real app, we would update the default payment method in the database
    setPaymentMethods(paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === id
    })));
    setSuccessMessage('Default payment method updated');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg flex items-center text-green-800">
          <CheckCircle className="h-5 w-5 mr-2" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="h-24 w-24 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
              <User className="h-12 w-12 text-yellow-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">{profile.full_name}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="mt-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              Customer
            </div>
          </div>
          
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center px-3 py-2 w-full text-left rounded-md ${
                activeTab === 'profile'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="h-5 w-5 mr-3" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center px-3 py-2 w-full text-left rounded-md ${
                activeTab === 'security'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Shield className="h-5 w-5 mr-3" />
              Security
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center px-3 py-2 w-full text-left rounded-md ${
                activeTab === 'notifications'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Bell className="h-5 w-5 mr-3" />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`flex items-center px-3 py-2 w-full text-left rounded-md ${
                activeTab === 'payment'
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CreditCard className="h-5 w-5 mr-3" />
              Payment Methods
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h2>
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
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h2>
              
              {isChangingPassword ? (
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
              ) : (
                <div className="space-y-6">
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
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-0.5">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-gray-900">Account Security</h3>
                      <p className="text-sm text-gray-500">
                        Protect your account by using a strong password and enabling two-factor authentication if available.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notification Settings */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h2>
              <form onSubmit={handleUpdateNotifications} className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Email Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="email_order_updates"
                          type="checkbox"
                          checked={notificationSettings.email_order_updates}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            email_order_updates: e.target.checked
                          })}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="email_order_updates" className="font-medium text-gray-700">Order Updates</label>
                        <p className="text-gray-500">Receive email notifications about your order status.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="email_promotions"
                          type="checkbox"
                          checked={notificationSettings.email_promotions}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            email_promotions: e.target.checked
                          })}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="email_promotions" className="font-medium text-gray-700">Promotions and Deals</label>
                        <p className="text-gray-500">Receive emails about special offers and promotions.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="email_group_buy_updates"
                          type="checkbox"
                          checked={notificationSettings.email_group_buy_updates}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            email_group_buy_updates: e.target.checked
                          })}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="email_group_buy_updates" className="font-medium text-gray-700">Group Buy Updates</label>
                        <p className="text-gray-500">Receive emails about group buys you've joined.</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Push Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="push_order_updates"
                          type="checkbox"
                          checked={notificationSettings.push_order_updates}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            push_order_updates: e.target.checked
                          })}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="push_order_updates" className="font-medium text-gray-700">Order Updates</label>
                        <p className="text-gray-500">Receive push notifications about your order status.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="push_promotions"
                          type="checkbox"
                          checked={notificationSettings.push_promotions}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            push_promotions: e.target.checked
                          })}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="push_promotions" className="font-medium text-gray-700">Promotions and Deals</label>
                        <p className="text-gray-500">Receive push notifications about special offers and promotions.</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="push_group_buy_updates"
                          type="checkbox"
                          checked={notificationSettings.push_group_buy_updates}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            push_group_buy_updates: e.target.checked
                          })}
                          className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="push_group_buy_updates" className="font-medium text-gray-700">Group Buy Updates</label>
                        <p className="text-gray-500">Receive push notifications about group buys you've joined.</p>
                      </div>
                    </div>
                  </div>
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
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Payment Methods */}
          {activeTab === 'payment' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Payment Methods</h2>
                <button className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Payment Method
                </button>
              </div>
              
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p>No payment methods added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <CreditCard className="h-6 w-6 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              •••• •••• •••• {method.last4}
                              {method.isDefault && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                                  Default
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">Expires {method.expiry}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {!method.isDefault && (
                            <button
                              onClick={() => handleSetDefaultPaymentMethod(method.id)}
                              className="text-sm text-yellow-600 hover:text-yellow-700"
                            >
                              Set as default
                            </button>
                          )}
                          <button
                            onClick={() => handleRemovePaymentMethod(method.id)}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerSettings;
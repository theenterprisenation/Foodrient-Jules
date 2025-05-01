import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  Home, 
  Building, 
  Navigation,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DeliveryAddress {
  id: string;
  user_id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const CustomerAddresses = () => {
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Partial<DeliveryAddress> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setAddresses(data || []);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAddress = () => {
    setSelectedAddress({
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      is_default: false
    });
    setIsAddingAddress(true);
    setIsEditingAddress(false);
  };

  const handleEditAddress = (address: DeliveryAddress) => {
    setSelectedAddress(address);
    setIsEditingAddress(true);
    setIsAddingAddress(false);
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('delivery_addresses')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccessMessage('Address deleted successfully');
      fetchAddresses();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error deleting address:', error);
      setError(error.message);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      // First, set all addresses to non-default
      const { error: resetError } = await supabase
        .from('delivery_addresses')
        .update({ is_default: false })
        .neq('id', 'none'); // This will update all addresses
        
      if (resetError) throw resetError;
      
      // Then set the selected address as default
      const { error } = await supabase
        .from('delivery_addresses')
        .update({ is_default: true })
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccessMessage('Default address updated');
      fetchAddresses();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error setting default address:', error);
      setError(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAddress) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      if (isAddingAddress) {
        // If setting as default, first reset all other addresses
        if (selectedAddress.is_default) {
          const { error: resetError } = await supabase
            .from('delivery_addresses')
            .update({ is_default: false })
            .neq('id', 'none');
            
          if (resetError) throw resetError;
        }
        
        // Add new address
        const { error } = await supabase
          .from('delivery_addresses')
          .insert([selectedAddress]);
          
        if (error) throw error;
        
        setSuccessMessage('Address added successfully');
      } else if (isEditingAddress && selectedAddress.id) {
        // If setting as default, first reset all other addresses
        if (selectedAddress.is_default) {
          const { error: resetError } = await supabase
            .from('delivery_addresses')
            .update({ is_default: false })
            .neq('id', selectedAddress.id);
            
          if (resetError) throw resetError;
        }
        
        // Update existing address
        const { error } = await supabase
          .from('delivery_addresses')
          .update({
            address_line1: selectedAddress.address_line1,
            address_line2: selectedAddress.address_line2,
            city: selectedAddress.city,
            state: selectedAddress.state,
            postal_code: selectedAddress.postal_code,
            is_default: selectedAddress.is_default
          })
          .eq('id', selectedAddress.id);
          
        if (error) throw error;
        
        setSuccessMessage('Address updated successfully');
      }
      
      fetchAddresses();
      setIsAddingAddress(false);
      setIsEditingAddress(false);
      setSelectedAddress(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving address:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Addresses</h1>
        <button
          onClick={handleAddAddress}
          className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add New Address
        </button>
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

      {/* Addresses Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : addresses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Addresses Found</h3>
          <p className="text-gray-500 mb-4">
            You haven't added any delivery addresses yet. Add an address to make checkout faster.
          </p>
          <button
            onClick={handleAddAddress}
            className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {addresses.map((address) => (
            <div key={address.id} className={`bg-white rounded-lg shadow-sm p-6 ${
              address.is_default ? 'border-2 border-yellow-500' : ''
            }`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="p-2 rounded-full bg-yellow-100">
                    <MapPin className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {address.is_default && (
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full mr-2">
                          Default
                        </span>
                      )}
                      {address.address_line1.split(',')[0]}
                    </h3>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditAddress(address)}
                    className="text-gray-400 hover:text-yellow-600"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAddress(address.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <p className="text-gray-700">{address.address_line1}</p>
                {address.address_line2 && (
                  <p className="text-gray-700">{address.address_line2}</p>
                )}
                <p className="text-gray-700">
                  {address.city}, {address.state} {address.postal_code || ''}
                </p>
              </div>
              
              {!address.is_default && (
                <div className="mt-4">
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="text-sm text-yellow-600 hover:text-yellow-700"
                  >
                    Set as default
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Address Modal */}
      {(isAddingAddress || isEditingAddress) && selectedAddress && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isAddingAddress ? 'Add New Address' : 'Edit Address'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Address Line 1</label>
                <input
                  type="text"
                  value={selectedAddress.address_line1 || ''}
                  onChange={(e) => setSelectedAddress({ ...selectedAddress, address_line1: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  value={selectedAddress.address_line2 || ''}
                  onChange={(e) => setSelectedAddress({ ...selectedAddress, address_line2: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={selectedAddress.city || ''}
                  onChange={(e) => setSelectedAddress({ ...selectedAddress, city: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">State</label>
                <input
                  type="text"
                  value={selectedAddress.state || ''}
                  onChange={(e) => setSelectedAddress({ ...selectedAddress, state: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Postal Code (Optional)</label>
                <input
                  type="text"
                  value={selectedAddress.postal_code || ''}
                  onChange={(e) => setSelectedAddress({ ...selectedAddress, postal_code: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  id="is_default"
                  type="checkbox"
                  checked={selectedAddress.is_default || false}
                  onChange={(e) => setSelectedAddress({ ...selectedAddress, is_default: e.target.checked })}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                  Set as default address
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAddress(false);
                    setIsEditingAddress(false);
                    setSelectedAddress(null);
                  }}
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      {isAddingAddress ? 'Add Address' : 'Update Address'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAddresses;
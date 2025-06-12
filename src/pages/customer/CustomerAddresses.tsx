import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DeliveryAddress {
  id: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string | null;
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
      // Use rpc for more control over the query
      const { data, error } = await supabase
        .rpc('get_user_addresses');
        
      if (error) throw error;
      
      setAddresses(data || []);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      setError(error.message || 'Failed to fetch addresses');
    } finally {
      setIsLoading(false);
    }
  };

  const resetAllDefaultAddresses = async (excludeId?: string) => {
    try {
      const { error } = await supabase
        .rpc('reset_default_addresses', { exclude_id: excludeId });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Error resetting default addresses:', error);
      throw error;
    }
  };

  const handleAddAddress = () => {
    setSelectedAddress({
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      is_default: addresses.length === 0
    });
    setIsAddingAddress(true);
    setIsEditingAddress(false);
  };

  const handleEditAddress = (address: DeliveryAddress) => {
    setSelectedAddress({ ...address });
    setIsEditingAddress(true);
    setIsEditingAddress(false);
  };

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .rpc('delete_address', { address_id: id });
        
      if (error) throw error;
      
      setSuccessMessage('Address deleted successfully');
      fetchAddresses();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error deleting address:', error);
      setError(error.message || 'Failed to delete address');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await supabase
        .rpc('set_default_address', { address_id: id });
      
      setSuccessMessage('Default address updated');
      fetchAddresses();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error setting default address:', error);
      setError(error.message || 'Failed to set default address');
    }
  };

  const validateAddress = (address: Partial<DeliveryAddress>) => {
    if (!address.address_line1 || !address.city || !address.state) {
      throw new Error('Address line 1, city, and state are required');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAddress) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      validateAddress(selectedAddress);

      if (isAddingAddress) {
        const { data, error } = await supabase
          .rpc('create_address', {
            address_line1: selectedAddress.address_line1,
            address_line2: selectedAddress.address_line2,
            city: selectedAddress.city,
            state: selectedAddress.state,
            postal_code: selectedAddress.postal_code,
            is_default: selectedAddress.is_default
          });
          
        if (error) throw error;
        
        setSuccessMessage('Address added successfully');
      } else if (isEditingAddress && selectedAddress.id) {
        const { error } = await supabase
          .rpc('update_address', {
            address_id: selectedAddress.id,
            address_line1: selectedAddress.address_line1,
            address_line2: selectedAddress.address_line2,
            city: selectedAddress.city,
            state: selectedAddress.state,
            postal_code: selectedAddress.postal_code,
            is_default: selectedAddress.is_default
          });
          
        if (error) throw error;
        
        setSuccessMessage('Address updated successfully');
      }
      
      fetchAddresses();
      setIsAddingAddress(false);
      setIsEditingAddress(false);
      setSelectedAddress(null);
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error saving address:', error);
      setError(error.message || 'Failed to save address');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <RefreshCw className="h-8 w-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* ... (keep your existing JSX structure) ... */}
    </div>
  );
};

export default CustomerAddresses;
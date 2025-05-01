import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  ShoppingBag, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  FileCheck,
  FileX
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Vendor {
  id: string;
  business_name: string;
  description: string | null;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  updated_at: string;
  kyc_status: 'pending' | 'verified' | 'rejected' | null;
  location: string | null;
  product_count: number;
  total_revenue: number;
}

const CoordinatorVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedKycStatus, setSelectedKycStatus] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vendorKycDocuments, setVendorKycDocuments] = useState<any[]>([]);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch vendors with KYC status
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select(`
          *,
          kyc:vendor_kyc(verification_status)
        `);
        
      if (vendorsError) throw vendorsError;
      
      // Fetch product counts
      const { data: productCounts, error: productsError } = await supabase
        .from('products')
        .select('vendor_id, count')
        .select('vendor_id')
        .select('*');
        
      if (productsError) throw productsError;
      
      // Count products per vendor
      const productCountMap = {};
      productCounts.forEach(product => {
        productCountMap[product.vendor_id] = (productCountMap[product.vendor_id] || 0) + 1;
      });
      
      // Fetch vendor metrics for revenue
      const { data: vendorMetrics, error: metricsError } = await supabase
        .from('vendor_metrics')
        .select('vendor_id, total_revenue')
        .order('period_end', { ascending: false });
        
      if (metricsError) throw metricsError;
      
      // Get latest revenue per vendor
      const revenueMap = {};
      vendorMetrics.forEach(metric => {
        if (!revenueMap[metric.vendor_id]) {
          revenueMap[metric.vendor_id] = metric.total_revenue;
        }
      });
      
      // Process vendor data
      const processedVendors = vendorsData.map(vendor => ({
        ...vendor,
        kyc_status: vendor.kyc?.[0]?.verification_status || null,
        location: 'Lagos, Nigeria', // Mock data
        product_count: productCountMap[vendor.id] || 0,
        total_revenue: revenueMap[vendor.id] || 0
      }));
      
      setVendors(processedVendors);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsViewingDetails(true);
    
    try {
      // Fetch KYC documents
      const { data: kycData, error: kycError } = await supabase
        .from('vendor_kyc')
        .select('*')
        .eq('vendor_id', vendor.id);
        
      if (kycError) throw kycError;
      setVendorKycDocuments(kycData || []);
    } catch (error: any) {
      console.error('Error fetching KYC documents:', error);
    }
  };

  const handleUpdateStatus = async (vendorId: string, newStatus: 'pending' | 'active' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update({ status: newStatus })
        .eq('id', vendorId);
        
      if (error) throw error;
      
      setSuccessMessage(`Vendor status updated to ${newStatus}`);
      fetchVendors();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating vendor status:', error);
      setError(error.message);
    }
  };

  const handleVerifyKyc = async (vendorId: string, status: 'verified' | 'rejected') => {
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('vendor_kyc')
        .update({
          verification_status: status,
          verified_at: new Date().toISOString(),
          verified_by: user.id
        })
        .eq('vendor_id', vendorId);
        
      if (error) throw error;
      
      setSuccessMessage(`KYC ${status === 'verified' ? 'verified' : 'rejected'} successfully`);
      fetchVendors();
      
      if (selectedVendor) {
        // Update selected vendor
        setSelectedVendor({
          ...selectedVendor,
          kyc_status: status
        });
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating KYC status:', error);
      setError(error.message);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = 
      vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_phone?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = selectedStatus === 'all' || vendor.status === selectedStatus;
    const matchesKyc = selectedKycStatus === 'all' || vendor.kyc_status === selectedKycStatus;
    
    return matchesSearch && matchesStatus && matchesKyc;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
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

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Status</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">KYC Status</label>
          <select
            value={selectedKycStatus}
            onChange={(e) => setSelectedKycStatus(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="all">All KYC Statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value={null}>Not Submitted</option>
          </select>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KYC Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No vendors found
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {vendor.logo_url ? (
                          <img 
                            src={vendor.logo_url} 
                            alt={vendor.business_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                            <Store className="h-5 w-5 text-yellow-600" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{vendor.business_name}</div>
                          <div className="text-xs text-gray-500">
                            Joined {formatDate(vendor.created_at)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.contact_email}</div>
                      <div className="text-sm text-gray-500">{vendor.contact_phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vendor.status === 'active' ? 'bg-green-100 text-green-800' :
                        vendor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vendor.kyc_status === 'verified' ? 'bg-green-100 text-green-800' :
                        vendor.kyc_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        vendor.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {vendor.kyc_status || 'Not Submitted'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vendor.product_count} products</div>
                      <div className="text-sm text-gray-500">₦{vendor.total_revenue.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(vendor)}
                        className="text-yellow-600 hover:text-yellow-900 mr-3"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      {vendor.status === 'pending' && (
                        <button
                          onClick={() => handleUpdateStatus(vendor.id, 'active')}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                      {vendor.status === 'active' && (
                        <button
                          onClick={() => handleUpdateStatus(vendor.id, 'suspended')}
                          className="text-red-600 hover:text-red-900"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      )}
                      {vendor.status === 'suspended' && (
                        <button
                          onClick={() => handleUpdateStatus(vendor.id, 'active')}
                          className="text-green-600 hover:text-green-900"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Details Modal */}
      {isViewingDetails && selectedVendor && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                {selectedVendor.logo_url ? (
                  <img 
                    src={selectedVendor.logo_url} 
                    alt={selectedVendor.business_name}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Store className="h-8 w-8 text-yellow-600" />
                  </div>
                )}
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-gray-900">{selectedVendor.business_name}</h3>
                  <p className="text-sm text-gray-500">
                    Joined {formatDate(selectedVendor.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsViewingDetails(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Vendor Information</h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{selectedVendor.contact_email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Phone</p>
                      <p className="text-sm text-gray-900">{selectedVendor.contact_phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Location</p>
                      <p className="text-sm text-gray-900">{selectedVendor.location || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <ShoppingBag className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Products</p>
                      <p className="text-sm text-gray-900">{selectedVendor.product_count} products listed</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Updated</p>
                      <p className="text-sm text-gray-900">{formatDate(selectedVendor.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">KYC Documents</h4>
                {vendorKycDocuments.length === 0 ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">No KYC documents submitted yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vendorKycDocuments.map((doc, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {doc.document_type.replace('_', ' ')}
                          </p>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            doc.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                            doc.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {doc.verification_status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">Document ID: {doc.document_number}</p>
                        {doc.verification_status === 'pending' && (
                          <div className="mt-3 flex space-x-2">
                            <button
                              onClick={() => handleVerifyKyc(selectedVendor.id, 'verified')}
                              className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                            >
                              <FileCheck className="h-4 w-4 mr-1" />
                              Verify
                            </button>
                            <button
                              onClick={() => handleVerifyKyc(selectedVendor.id, 'rejected')}
                              className="flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                            >
                              <FileX className="h-4 w-4 mr-1" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                <h4 className="text-lg font-medium text-gray-900 mt-6 mb-4">Status Management</h4>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleUpdateStatus(selectedVendor.id, 'active')}
                    className={`px-4 py-2 rounded-md ${
                      selectedVendor.status === 'active'
                        ? 'bg-green-100 text-green-800 cursor-default'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                    disabled={selectedVendor.status === 'active'}
                  >
                    <CheckCircle className="h-5 w-5 inline mr-1" />
                    Activate
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedVendor.id, 'suspended')}
                    className={`px-4 py-2 rounded-md ${
                      selectedVendor.status === 'suspended'
                        ? 'bg-red-100 text-red-800 cursor-default'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    }`}
                    disabled={selectedVendor.status === 'suspended'}
                  >
                    <XCircle className="h-5 w-5 inline mr-1" />
                    Suspend
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Vendor Description</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  {selectedVendor.description || 'No description provided'}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsViewingDetails(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoordinatorVendors;
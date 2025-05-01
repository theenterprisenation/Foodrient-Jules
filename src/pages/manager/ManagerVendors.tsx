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
  TrendingUp,
  ArrowUpRight
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
  location: string | null;
  product_count: number;
  total_revenue: number;
  total_orders: number;
}

const ManagerVendors = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vendorProducts, setVendorProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchAssignedVendors();
  }, []);

  const fetchAssignedVendors = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Fetch assigned vendors
      const { data: assignments, error: assignmentsError } = await supabase
        .from('manager_assignments')
        .select('vendor_id')
        .eq('manager_id', user.id);
        
      if (assignmentsError) throw assignmentsError;
      
      if (!assignments || assignments.length === 0) {
        setVendors([]);
        setIsLoading(false);
        return;
      }
      
      const vendorIds = assignments.map(a => a.vendor_id);
      
      // Fetch vendor details
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('*')
        .in('id', vendorIds);
        
      if (vendorsError) throw vendorsError;
      
      // Fetch product counts
      const { data: productCounts, error: productsError } = await supabase
        .from('products')
        .select('vendor_id')
        .in('vendor_id', vendorIds);
        
      if (productsError) throw productsError;
      
      // Count products per vendor
      const productCountMap = {};
      productCounts?.forEach(product => {
        productCountMap[product.vendor_id] = (productCountMap[product.vendor_id] || 0) + 1;
      });
      
      // Fetch order data
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          order_id,
          product:products(
            vendor_id
          ),
          order:orders(
            total_amount,
            created_at
          )
        `)
        .in('product.vendor_id', vendorIds);
        
      if (orderItemsError) throw orderItemsError;
      
      // Calculate revenue and order count per vendor
      const revenueMap = {};
      const orderCountMap = {};
      const processedOrders = new Set();
      
      orderItems?.forEach(item => {
        const vendorId = item.product?.vendor_id;
        const orderId = item.order_id;
        const amount = item.order?.total_amount || 0;
        
        if (vendorId) {
          // Add to revenue
          revenueMap[vendorId] = (revenueMap[vendorId] || 0) + amount;
          
          // Count unique orders
          if (!processedOrders.has(`${vendorId}-${orderId}`)) {
            orderCountMap[vendorId] = (orderCountMap[vendorId] || 0) + 1;
            processedOrders.add(`${vendorId}-${orderId}`);
          }
        }
      });
      
      // Process vendor data
      const processedVendors = vendorsData?.map(vendor => ({
        ...vendor,
        location: 'Lagos, Nigeria', // Mock data
        product_count: productCountMap[vendor.id] || 0,
        total_revenue: revenueMap[vendor.id] || 0,
        total_orders: orderCountMap[vendor.id] || 0
      }));
      
      setVendors(processedVendors || []);
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
      // Fetch vendor products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendor.id)
        .eq('status', 'active');
        
      if (productsError) throw productsError;
      setVendorProducts(products || []);
    } catch (error: any) {
      console.error('Error fetching vendor products:', error);
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = 
      vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_phone?.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = selectedStatus === 'all' || vendor.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Assigned Vendors</h1>
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

      {/* Vendors Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : vendors.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Vendors Assigned</h3>
          <p className="text-gray-500">
            You don't have any vendors assigned to you yet. Please contact your coordinator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map((vendor) => (
            <div key={vendor.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="relative h-40 bg-gradient-to-r from-yellow-100 to-yellow-200">
                {vendor.logo_url ? (
                  <img 
                    src={vendor.logo_url} 
                    alt={vendor.business_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Store className="h-16 w-16 text-yellow-500" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    vendor.status === 'active' ? 'bg-green-100 text-green-800' :
                    vendor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {vendor.status}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{vendor.business_name}</h3>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {vendor.description || 'No description available'}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    {vendor.location || 'Location not specified'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    {vendor.contact_email || 'Email not provided'}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                    {vendor.contact_phone || 'Phone not provided'}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Products</p>
                    <p className="text-sm font-semibold text-gray-900">{vendor.product_count}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Orders</p>
                    <p className="text-sm font-semibold text-gray-900">{vendor.total_orders}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-sm font-semibold text-gray-900">₦{vendor.total_revenue.toLocaleString()}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleViewDetails(vendor)}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
                <h4 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h4>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Total Revenue</p>
                      <p className="text-sm font-bold text-gray-900">₦{selectedVendor.total_revenue.toLocaleString()}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Total Orders</p>
                      <p className="text-sm font-bold text-gray-900">{selectedVendor.total_orders}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-700">Product Variety</p>
                      <p className="text-sm font-bold text-gray-900">{selectedVendor.product_count} products</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <button className="text-sm text-yellow-600 hover:text-yellow-700 flex items-center">
                      View Detailed Analytics
                      <ArrowUpRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
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
            
            {/* Products List */}
            <div className="mt-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Products ({vendorProducts.length})</h4>
              {vendorProducts.length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">No products available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendorProducts.slice(0, 6).map((product) => (
                    <div key={product.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-500">₦{product.base_price.toLocaleString()}/{product.unit}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {vendorProducts.length > 6 && (
                    <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-center">
                      <button className="text-sm text-yellow-600 hover:text-yellow-700">
                        View {vendorProducts.length - 6} more products
                      </button>
                    </div>
                  )}
                </div>
              )}
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

export default ManagerVendors;
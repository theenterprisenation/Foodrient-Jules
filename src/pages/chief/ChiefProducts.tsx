import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  Eye, 
  ShoppingBag, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Store,
  Tag,
  Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Product {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  base_price: number;
  min_quantity: number;
  max_quantity: number | null;
  available_quantity: number;
  unit: string;
  category: string;
  status: 'active' | 'inactive' | 'deleted';
  has_price_tiers: boolean;
  price_tiers: string | null;
  created_at: string;
  updated_at: string;
  vendor?: {
    business_name: string;
    location: string;
  };
  vendor_location?: string;
  share_date?: string;
}

const ChiefProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vendors, setVendors] = useState<{id: string; business_name: string}[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isViewingDetails, setIsViewingDetails] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, business_name')
        .eq('status', 'active');
        
      if (error) throw error;
      
      setVendors(data || []);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          vendor:vendors(
            business_name,
            location:vendor_locations(address)
          )
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Process products
      const processedProducts = data?.map(product => ({
        ...product,
        vendor_location: product.vendor?.location?.[0]?.address || 'Location not specified'
      })) || [];
      
      setProducts(processedProducts);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsViewingDetails(true);
  };

  const handleExportProducts = () => {
    try {
      // Create CSV content
      const headers = ['Name', 'Vendor', 'Category', 'Price', 'Available Quantity', 'Unit', 'Status', 'Location', 'Share Date'];
      const csvContent = [
        headers.join(','),
        ...filteredProducts.map(product => [
          `"${product.name.replace(/"/g, '""')}"`,
          `"${product.vendor?.business_name || 'Unknown'}"`,
          product.category,
          product.base_price,
          product.available_quantity,
          product.unit,
          product.status,
          `"${product.vendor_location || 'Unknown'}"`,
          product.share_date || ''
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `products-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setSuccessMessage('Products exported successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error exporting products:', error);
      setError(error.message);
    }
  };

  // Get unique values for filters
  const locations = Array.from(new Set(products.map(p => p.vendor_location || 'Unknown')));
  const categories = ['vegetables', 'fruits', 'grains', 'meat', 'seafood', 'oil'];

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (product.vendor?.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesVendor = selectedVendor === 'all' || product.vendor_id === selectedVendor;
    const matchesLocation = selectedLocation === 'all' || product.vendor_location === selectedLocation;
    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesVendor && matchesLocation && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">All Products & Deals</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-5 w-5 mr-2" />
            Filters
            <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${showFilters ? 'transform rotate-180' : ''}`} />
          </button>
          <button
            onClick={handleExportProducts}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            Export
          </button>
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
      {showFilters && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm animate-fadeIn">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Vendors</option>
              {vendors.map(vendor => (
                <option key={vendor.id} value={vendor.id}>{vendor.business_name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="deleted">Deleted</option>
            </select>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
          <p className="text-gray-500">
            No products match your search criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="relative h-48">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                {product.has_price_tiers && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                    Group Buy
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    product.status === 'active' ? 'bg-green-100 text-green-800' : 
                    product.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 
                    'bg-red-100 text-red-800'
                  }`}>
                    {product.status}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    {product.category}
                  </span>
                </div>
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <Store className="h-4 w-4 mr-1" />
                  {product.vendor?.business_name || 'Unknown Vendor'}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Package className="h-4 w-4 mr-2" />
                    Available: {product.available_quantity} {product.unit}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-2" />
                    {product.vendor_location || 'Location not specified'}
                  </div>
                  {product.share_date && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      Share Date: {formatDate(product.share_date)}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-xl font-bold text-yellow-600">
                    ₦{product.base_price.toLocaleString()}/{product.unit}
                  </div>
                </div>
                <button
                  onClick={() => handleViewDetails(product)}
                  className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Details Modal */}
      {isViewingDetails && selectedProduct && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center">
                {selectedProduct.image_url ? (
                  <img 
                    src={selectedProduct.image_url} 
                    alt={selectedProduct.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                )}
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h3>
                  <div className="flex items-center mt-1">
                    <Store className="h-4 w-4 text-gray-500 mr-1" />
                    <span className="text-sm text-gray-600">{selectedProduct.vendor?.business_name || 'Unknown Vendor'}</span>
                  </div>
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
                <h4 className="text-lg font-medium text-gray-900 mb-4">Product Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Tag className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Category</p>
                        <p className="text-sm text-gray-900 capitalize">{selectedProduct.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Package className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Quantity</p>
                        <p className="text-sm text-gray-900">
                          Available: {selectedProduct.available_quantity} {selectedProduct.unit}
                        </p>
                        <p className="text-sm text-gray-900">
                          Min Order: {selectedProduct.min_quantity} {selectedProduct.unit}
                        </p>
                        {selectedProduct.max_quantity && (
                          <p className="text-sm text-gray-900">
                            Max Order: {selectedProduct.max_quantity} {selectedProduct.unit}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <DollarSign className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Pricing</p>
                        <p className="text-sm text-gray-900">
                          Base Price: ₦{selectedProduct.base_price.toLocaleString()}/{selectedProduct.unit}
                        </p>
                        {selectedProduct.has_price_tiers && selectedProduct.price_tiers && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">Price Tiers:</p>
                            <div className="space-y-1 mt-1">
                              {JSON.parse(selectedProduct.price_tiers).map((tier: any, index: number) => (
                                <p key={index} className="text-sm text-gray-900">
                                  {tier.participants}+ participants: ₦{tier.price.toLocaleString()}/{selectedProduct.unit}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Location</p>
                        <p className="text-sm text-gray-900">{selectedProduct.vendor_location || 'Location not specified'}</p>
                      </div>
                    </div>
                    
                    {selectedProduct.share_date && (
                      <div className="flex items-start">
                        <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">Share Date</p>
                          <p className="text-sm text-gray-900">{formatDate(selectedProduct.share_date)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Product Status</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center mb-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedProduct.status === 'active' ? 'bg-green-100 text-green-800' : 
                      selectedProduct.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedProduct.status}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      Last updated: {formatDate(selectedProduct.updated_at)}
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <TrendingUp className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Group Buy Status</p>
                        <p className="text-sm text-gray-900">
                          {selectedProduct.has_price_tiers ? 'Enabled' : 'Disabled'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Created At</p>
                        <p className="text-sm text-gray-900">{formatDate(selectedProduct.created_at)}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <h4 className="text-lg font-medium text-gray-900 mt-6 mb-4">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    {selectedProduct.description || 'No description provided'}
                  </p>
                </div>
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

export default ChiefProducts;
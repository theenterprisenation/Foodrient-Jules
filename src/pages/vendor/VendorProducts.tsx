import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  Video, 
  Image as ImageIcon,
  CheckCircle,
  AlertTriangle,
  Filter,
  ChevronDown,
  Eye,
  EyeOff,
  Tag
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
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
  vendor_location?: string;
  share_date?: string;
}

interface PriceTier {
  participants: number;
  price: number;
}

const VendorProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingDeal, setIsAddingDeal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Partial<Product> | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [enableTiers, setEnableTiers] = useState(false);
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([
    { participants: 5, price: 0 },
    { participants: 10, price: 0 },
    { participants: 20, price: 0 }
  ]);
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    fetchVendorId();
  }, []);

  useEffect(() => {
    if (vendorId) {
      fetchProducts();
    }
  }, [vendorId]);

  const fetchVendorId = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Fetch vendor profile
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (vendorError) throw vendorError;
      
      setVendorId(vendorData.id);
    } catch (error: any) {
      console.error('Error fetching vendor ID:', error);
      setError(error.message);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = () => {
    setIsAddingProduct(true);
    setIsAddingDeal(false);
    setIsEditing(false);
    setEnableTiers(false);
    setSelectedProduct({
      name: '',
      description: '',
      image_url: '',
      video_url: '',
      base_price: 0,
      min_quantity: 1,
      max_quantity: null,
      available_quantity: 0,
      unit: 'kg',
      category: 'vegetables',
      status: 'active',
      has_price_tiers: false,
      price_tiers: null,
      vendor_location: 'Lagos, Nigeria',
      share_date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const handleAddDeal = () => {
    setIsAddingDeal(true);
    setIsAddingProduct(false);
    setIsEditing(false);
    setEnableTiers(true);
    setPriceTiers([
      { participants: 5, price: 0 },
      { participants: 10, price: 0 },
      { participants: 20, price: 0 }
    ]);
    setSelectedProduct({
      name: '',
      description: '',
      image_url: '',
      video_url: '',
      base_price: 0,
      min_quantity: 1,
      max_quantity: null,
      available_quantity: 0,
      unit: 'kg',
      category: 'vegetables',
      status: 'active',
      has_price_tiers: true,
      price_tiers: null,
      vendor_location: 'Lagos, Nigeria',
      share_date: format(new Date(), 'yyyy-MM-dd')
    });
  };

  const handleEditProduct = (product: Product) => {
    setIsEditing(true);
    setIsAddingProduct(false);
    setIsAddingDeal(false);
    setSelectedProduct(product);
    setEnableTiers(product.has_price_tiers);
    
    if (product.price_tiers) {
      try {
        setPriceTiers(JSON.parse(product.price_tiers));
      } catch (e) {
        console.error('Error parsing price tiers:', e);
        setPriceTiers([
          { participants: 5, price: 0 },
          { participants: 10, price: 0 },
          { participants: 20, price: 0 }
        ]);
      }
    } else {
      setPriceTiers([
        { participants: 5, price: 0 },
        { participants: 10, price: 0 },
        { participants: 20, price: 0 }
      ]);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: 'deleted' })
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccessMessage('Product deleted successfully');
      fetchProducts();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      setError(error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) return;
    
    try {
      const productData = {
        ...selectedProduct,
        vendor_id: vendorId,
        has_price_tiers: enableTiers,
        price_tiers: enableTiers ? JSON.stringify(priceTiers) : null
      };
      
      if (isEditing) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productData.id);
          
        if (error) throw error;
        
        setSuccessMessage('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);
          
        if (error) throw error;
        
        setSuccessMessage(enableTiers ? 'Deal created successfully' : 'Product created successfully');
      }
      
      fetchProducts();
      setIsAddingProduct(false);
      setIsAddingDeal(false);
      setIsEditing(false);
      setSelectedProduct(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving product:', error);
      setError(error.message);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
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
          <div className="flex space-x-2">
            <button
              onClick={handleAddProduct}
              className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Product
            </button>
            <button
              onClick={handleAddDeal}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
            >
              <TrendingUp className="h-5 w-5 mr-2" />
              Add Deal
            </button>
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
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          <Filter className="h-5 w-5 mr-2" />
          Filters
          <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${showFilters ? 'transform rotate-180' : ''}`} />
        </button>
        
        {showFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow-sm animate-fadeIn">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
              >
                <option value="all">All Categories</option>
                <option value="vegetables">Vegetables</option>
                <option value="fruits">Fruits</option>
                <option value="grains">Grains</option>
                <option value="meat">Meat</option>
                <option value="seafood">Seafood</option>
                <option value="oil">Oil</option>
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
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
          <p className="text-gray-500">
            {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all'
              ? 'Try adjusting your filters or search term'
              : 'Get started by adding your first product'}
          </p>
          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={handleAddProduct}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
            >
              Add Product
            </button>
            <button
              onClick={handleAddDeal}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              Add Deal
            </button>
          </div>
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
                    product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{product.description}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Package className="h-4 w-4 mr-2" />
                    Available: {product.available_quantity} {product.unit}
                  </div>
                  <div className="text-sm text-gray-500">
                    Min Order: {product.min_quantity} {product.unit}
                  </div>
                  {product.vendor_location && (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2" />
                      {product.vendor_location}
                    </div>
                  )}
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
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="text-yellow-600 hover:text-yellow-700"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {(isAddingProduct || isAddingDeal || isEditing) && selectedProduct && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isEditing ? 'Edit Product' : isAddingDeal ? 'Add New Deal with Price Tiers' : 'Add New Product'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Listing Type Selection */}
              {!isEditing && (
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Listing Type</label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={!enableTiers}
                        onChange={() => {
                          setEnableTiers(false);
                          setIsAddingDeal(false);
                          setIsAddingProduct(true);
                        }}
                        className="form-radio text-yellow-500 focus:ring-yellow-500"
                      />
                      <span className="ml-2">Regular Product</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        checked={enableTiers}
                        onChange={() => {
                          setEnableTiers(true);
                          setIsAddingDeal(true);
                          setIsAddingProduct(false);
                        }}
                        className="form-radio text-yellow-500 focus:ring-yellow-500"
                      />
                      <span className="ml-2">Group Buy Deal</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Media Section */}
                <div className="sm:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Media</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Product Image URL
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1 flex items-center">
                        <input
                          type="url"
                          required
                          value={selectedProduct?.image_url || ''}
                          onChange={(e) => setSelectedProduct({ ...selectedProduct, image_url: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                          placeholder="https://example.com/image.jpg"
                        />
                        <ImageIcon className="h-5 w-5 text-gray-400 ml-2" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Product Video URL (optional)
                      </label>
                      <div className="mt-1 flex items-center">
                        <input
                          type="url"
                          value={selectedProduct?.video_url || ''}
                          onChange={(e) => setSelectedProduct({ ...selectedProduct, video_url: e.target.value })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                          placeholder="https://example.com/video.mp4"
                        />
                        <Video className="h-5 w-5 text-gray-400 ml-2" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Name
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={selectedProduct?.name || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedProduct?.category || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, category: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  >
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="grains">Grains</option>
                    <option value="meat">Meat</option>
                    <option value="seafood">Seafood</option>
                    <option value="oil">Oil</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Vendor Location
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="text"
                      required
                      value={selectedProduct?.vendor_location || ''}
                      onChange={(e) => setSelectedProduct({ ...selectedProduct, vendor_location: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                    <MapPin className="h-5 w-5 text-gray-400 ml-2" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Share Date
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="date"
                      required
                      value={selectedProduct?.share_date || ''}
                      onChange={(e) => setSelectedProduct({ ...selectedProduct, share_date: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                    <Calendar className="h-5 w-5 text-gray-400 ml-2" />
                  </div>
                </div>

                {/* Pricing and Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Base Price (₦)
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={selectedProduct?.base_price || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, base_price: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Unit
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedProduct?.unit || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, unit: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  >
                    <option value="kg">Kilogram (kg)</option>
                    <option value="g">Gram (g)</option>
                    <option value="piece">Piece</option>
                    <option value="dozen">Dozen</option>
                    <option value="crate">Crate</option>
                    <option value="basket">Basket</option>
                    <option value="bag">Bag</option>
                    <option value="litre">Litre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Minimum Quantity
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={selectedProduct?.min_quantity || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, min_quantity: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Maximum Quantity (optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={selectedProduct?.max_quantity || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, max_quantity: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Available Quantity
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={selectedProduct?.available_quantity || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, available_quantity: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={selectedProduct?.status || 'active'}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, status: e.target.value as 'active' | 'inactive' | 'deleted' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    rows={3}
                    value={selectedProduct?.description || ''}
                    onChange={(e) => setSelectedProduct({ ...selectedProduct, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>

                {/* Group Buy Price Tiers */}
                {(isAddingDeal || (isEditing && selectedProduct?.has_price_tiers)) && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableTiers"
                        checked={enableTiers}
                        onChange={(e) => setEnableTiers(e.target.checked)}
                        className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                      />
                      <label htmlFor="enableTiers" className="text-sm font-medium text-gray-700">
                        Enable Price Tiers
                      </label>
                    </div>

                    {enableTiers && (
                      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Price Tiers</h4>
                        <div className="space-y-4">
                          {priceTiers.map((tier, index) => (
                            <div key={index} className="flex items-center space-x-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Participants
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={tier.participants}
                                  onChange={(e) => {
                                    const newTiers = [...priceTiers];
                                    newTiers[index].participants = parseInt(e.target.value);
                                    setPriceTiers(newTiers);
                                  }}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Price (₦)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={tier.price}
                                  onChange={(e) => {
                                    const newTiers = [...priceTiers];
                                    newTiers[index].price = parseFloat(e.target.value);
                                    setPriceTiers(newTiers);
                                  }}
                                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                                />
                              </div>
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPriceTiers(priceTiers.filter((_, i) => i !== index));
                                  }}
                                  className="mt-6 text-red-600 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setPriceTiers([...priceTiers, { participants: 0, price: 0 }])}
                            className="text-sm text-yellow-600 hover:text-yellow-700"
                          >
                            + Add Price Tier
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingProduct(false);
                    setIsAddingDeal(false);
                    setIsEditing(false);
                    setSelectedProduct(null);
                    setEnableTiers(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  {isEditing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorProducts;
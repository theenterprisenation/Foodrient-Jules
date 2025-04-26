import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Search, Edit, Trash2, Calendar, MapPin, TrendingUp, Video, Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useProductStore } from '../store/productStore';
import type { Product } from '../types';

const ProductListing = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { products, isLoading, error, createProduct, updateProduct, deleteProduct, fetchProducts } = useProductStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Partial<Product> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [enableTiers, setEnableTiers] = useState(false);
  const [priceTiers, setPriceTiers] = useState([
    { participants: 5, price: 0 },
    { participants: 10, price: 0 },
    { participants: 20, price: 0 }
  ]);
  const [listingType, setListingType] = useState<'produce' | 'groupbuy'>('produce');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProducts();
  }, [user, navigate, fetchProducts]);

  const initialProductState = {
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
    status: 'active' as const,
    has_price_tiers: false,
    price_tiers: null,
    vendor_location: '',
    share_date: new Date().toISOString().split('T')[0]
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const productData = {
        ...selectedProduct,
        has_price_tiers: listingType === 'groupbuy' && enableTiers,
        price_tiers: listingType === 'groupbuy' && enableTiers ? JSON.stringify(priceTiers) : null
      };
      await createProduct(productData as any);
      setIsAddingProduct(false);
      setSelectedProduct(null);
      setEnableTiers(false);
      setPriceTiers([
        { participants: 5, price: 0 },
        { participants: 10, price: 0 },
        { participants: 20, price: 0 }
      ]);
    } catch (error) {
      console.error('Failed to add product:', error);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct?.id) return;

    try {
      const productData = {
        ...selectedProduct,
        has_price_tiers: listingType === 'groupbuy' && enableTiers,
        price_tiers: listingType === 'groupbuy' && enableTiers ? JSON.stringify(priceTiers) : null
      };
      await updateProduct(selectedProduct.id, productData);
      setIsEditing(false);
      setSelectedProduct(null);
      setEnableTiers(false);
      setPriceTiers([
        { participants: 5, price: 0 },
        { participants: 10, price: 0 },
        { participants: 20, price: 0 }
      ]);
    } catch (error) {
      console.error('Failed to update product:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
      } catch (error) {
        console.error('Failed to delete product:', error);
      }
    }
  };

  const handleEditClick = (product: Product) => {
    setSelectedProduct(product);
    setListingType(product.has_price_tiers ? 'groupbuy' : 'produce');
    setEnableTiers(product.has_price_tiers || false);
    setPriceTiers(product.price_tiers ? JSON.parse(product.price_tiers) : [
      { participants: 5, price: 0 },
      { participants: 10, price: 0 },
      { participants: 20, price: 0 }
    ]);
    setIsEditing(true);
  };

  const ProductForm = ({ onSubmit, initialData = initialProductState, isEdit = false }) => (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Listing Type Selection */}
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">Listing Type</label>
        <div className="flex space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="produce"
              checked={listingType === 'produce'}
              onChange={(e) => {
                setListingType('produce');
                setEnableTiers(false);
              }}
              className="form-radio text-yellow-500 focus:ring-yellow-500"
            />
            <span className="ml-2">Food Produce</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              value="groupbuy"
              checked={listingType === 'groupbuy'}
              onChange={(e) => setListingType('groupbuy')}
              className="form-radio text-yellow-500 focus:ring-yellow-500"
            />
            <span className="ml-2">Group Buy</span>
          </label>
        </div>
      </div>

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
        {listingType === 'groupbuy' && (
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
            setIsEditing(false);
            setSelectedProduct(null);
            setEnableTiers(false);
            setPriceTiers([
              { participants: 5, price: 0 },
              { participants: 10, price: 0 },
              { participants: 20, price: 0 }
            ]);
          }}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
        >
          {isEdit ? 'Update Product' : 'Add Product'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Product Listings</h1>
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
              onClick={() => {
                setSelectedProduct(initialProductState);
                setIsAddingProduct(true);
              }}
              className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Product
            </button>
          </div>
        </div>

        {/* Add/Edit Product Modal */}
        {(isAddingProduct || isEditing) && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h3>
              <ProductForm
                onSubmit={isEditing ? handleEditProduct : handleAddProduct}
                initialData={selectedProduct || initialProductState}
                isEdit={isEditing}
              />
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-500">{product.description}</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Package className="h-4 w-4 mr-2" />
                    Available: {product.available_quantity} {product.unit}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-2" />
                    {product.vendor_location}
                  </div>
                  {product.has_price_tiers && (
                    <div className="flex items-center text-sm text-green-600">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Group buy with price tiers
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    ₦{product.base_price.toLocaleString()}/{product.unit}
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => handleEditClick(product)}
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
      </div>
    </div>
  );
};

export default ProductListing;
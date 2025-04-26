import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, TrendingUp, Users, DollarSign, ShoppingCart, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useVendorStore } from '../store/vendorStore';
import { Product } from '../types';

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { vendor, products, fetchVendorProfile, fetchVendorProducts } = useVendorStore();
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    base_price: 0,
    min_quantity: 1,
    available_quantity: 0,
    unit: 'kg',
    category: 'vegetables'
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchVendorProfile();
    fetchVendorProducts();
  }, [user, navigate, fetchVendorProfile, fetchVendorProducts]);

  const stats = [
    { name: 'Total Products', value: products.length, icon: Package, color: 'text-blue-500' },
    { name: 'Active Group Buys', value: '12', icon: Users, color: 'text-green-500' },
    { name: 'Total Sales', value: '₦150,000', icon: DollarSign, color: 'text-yellow-500' },
    { name: 'Pending Orders', value: '8', icon: ShoppingCart, color: 'text-red-500' }
  ];

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Add product logic here
      setIsAddingProduct(false);
    } catch (error) {
      console.error('Failed to add product:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Vendor Profile Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center">
            {vendor?.logo_url ? (
              <img src={vendor.logo_url} alt={vendor.business_name} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <Store className="h-8 w-8 text-yellow-600" />
              </div>
            )}
            <div className="ml-4">
              <h1 className="text-2xl font-bold text-gray-900">{vendor?.business_name}</h1>
              <p className="text-gray-500">{vendor?.description}</p>
            </div>
            <button className="ml-auto bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600">
              Edit Profile
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">{stat.name}</div>
                  <div className="text-xl font-semibold text-gray-900">{stat.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Products Management */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Products</h2>
            <button
              onClick={() => setIsAddingProduct(true)}
              className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 flex items-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Product
            </button>
          </div>

          {isAddingProduct && (
            <form onSubmit={handleAddProduct} className="mb-8 bg-gray-50 p-6 rounded-lg">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name</label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  >
                    <option value="vegetables">Vegetables</option>
                    <option value="fruits">Fruits</option>
                    <option value="grains">Grains</option>
                    <option value="meat">Meat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Base Price (₦)</label>
                  <input
                    type="number"
                    value={newProduct.base_price}
                    onChange={(e) => setNewProduct({ ...newProduct, base_price: parseFloat(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Available Quantity</label>
                  <input
                    type="number"
                    value={newProduct.available_quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, available_quantity: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  Add Product
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₦{product.base_price}/{product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.available_quantity} {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-yellow-600 hover:text-yellow-900 mr-4">
                        <Edit className="h-5 w-5" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Package, Users, Star, MapPin, Clock, TrendingUp } from 'lucide-react';
import { useVendorStore } from '../store/vendorStore';
import { useGroupBuyStore } from '../store/groupBuyStore';
import { GroupBuyCard } from '../components/GroupBuyCard';
import { ProductCard } from '../components/ProductCard';

const VendorShop = () => {
  const { vendorId } = useParams();
  const { vendor, products, metrics, fetchVendorProfile, fetchVendorProducts, fetchVendorMetrics } = useVendorStore();
  const { groupBuys, fetchGroupBuys } = useGroupBuyStore();
  const [activeTab, setActiveTab] = useState<'products' | 'group-buys'>('products');

  useEffect(() => {
    if (vendorId) {
      fetchVendorProfile(vendorId);
      fetchVendorProducts(vendorId);
      fetchVendorMetrics(vendorId);
      fetchGroupBuys(vendorId);
    }
  }, [vendorId]);

  if (!vendor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  const vendorGroupBuys = groupBuys.filter(gb => 
    products.some(p => p.id === gb.product_id)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-80">
        <div className="absolute inset-0">
          <img
            src={vendor.banner_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e'}
            alt={vendor.business_name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="flex items-center space-x-8">
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white">
              <img
                src={vendor.logo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e'}
                alt={vendor.business_name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-white">
              <h1 className="text-4xl font-bold">{vendor.business_name}</h1>
              <p className="mt-2 text-lg">{vendor.description}</p>
              <div className="mt-4 flex items-center space-x-4">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-1" />
                  <span>{vendor.location}</span>
                </div>
                <div className="flex items-center">
                  <Star className="h-5 w-5 mr-1 text-yellow-400" />
                  <span>{metrics?.rating || '0'} Rating</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-1" />
                  <span>Member since {new Date(vendor.created_at).getFullYear()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'Total Orders', value: metrics?.total_orders || 0, icon: Package },
            { name: 'Active Group Buys', value: vendorGroupBuys.length, icon: Users },
            { name: 'Total Revenue', value: `₦${(metrics?.total_revenue || 0).toLocaleString()}`, icon: TrendingUp },
            { name: 'Avg. Delivery Time', value: metrics?.average_delivery_time || '0 days', icon: Clock }
          ].map((stat) => (
            <div key={stat.name} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-yellow-500" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-500">{stat.name}</div>
                  <div className="text-xl font-semibold text-gray-900">{stat.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('products')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'products'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('group-buys')}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === 'group-buys'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              Group Buys
            </button>
          </nav>
        </div>

        <div className="mt-8">
          {activeTab === 'products' ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {vendorGroupBuys.map(groupBuy => (
                <GroupBuyCard key={groupBuy.id} groupBuy={groupBuy} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorShop;
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, Star, MapPin, Package, TrendingUp, Clock, Store } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MainMenu } from '../components/MainMenu';
import { Pagination } from '../components/Pagination';

interface VendorMetrics {
  total_orders: number;
  completed_orders: number;
  total_revenue: number;
  rating: number;
  average_delivery_time: string;
}

interface Vendor {
  id: string;
  business_name: string;
  description: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  created_at: string;
  metrics: VendorMetrics;
  location: string;
}

const ITEMS_PER_PAGE = 12;

const VendorShops = () => {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select(`
          *,
          metrics:vendor_metrics(
            total_orders,
            completed_orders,
            total_revenue,
            rating,
            average_delivery_time
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (vendorsError) throw vendorsError;

      setVendors(vendorsData || []);
    } catch (error: any) {
      console.error('Error fetching vendors:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const locations = Array.from(new Set(vendors.map(v => v.location || 'Unknown')));

  const filteredVendors = vendors
    .filter(vendor => {
      const matchesSearch = (
        vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const matchesLocation = selectedLocation === 'all' || vendor.location === selectedLocation;

      return matchesSearch && matchesLocation;
    })
    .sort((a, b) => {
      const metricsA = a.metrics?.[0] || {};
      const metricsB = b.metrics?.[0] || {};

      switch (sortBy) {
        case 'rating':
          return (metricsB.rating || 0) - (metricsA.rating || 0);
        case 'orders':
          return (metricsB.total_orders || 0) - (metricsA.total_orders || 0);
        case 'revenue':
          return (metricsB.total_revenue || 0) - (metricsA.total_revenue || 0);
        case 'delivery':
          const timeA = metricsA.average_delivery_time ? new Date(metricsA.average_delivery_time).getTime() : Infinity;
          const timeB = metricsB.average_delivery_time ? new Date(metricsB.average_delivery_time).getTime() : Infinity;
          return timeA - timeB;
        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedVendors = filteredVendors.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleVendorClick = (vendorId: string) => {
    navigate(`/shop/${vendorId}`);
  };

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < Math.floor(rating)
            ? 'text-yellow-400 fill-current'
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MainMenu />
      
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                Vendor Shops
              </span>
            </h1>
            <p className="mt-4 text-xl text-gray-600">
              Discover our trusted vendors and their quality products
            </p>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col space-y-4 mb-8">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search vendors by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${showFilters ? 'transform rotate-180' : ''}`} />
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="rating">Sort by Rating</option>
                <option value="orders">Most Orders</option>
                <option value="revenue">Highest Revenue</option>
                <option value="delivery">Fastest Delivery</option>
              </select>
            </div>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="bg-white p-4 rounded-lg shadow-sm space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="all">All Locations</option>
                    {locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setSelectedLocation('all');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Vendors Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 py-12">
              {error}
            </div>
          ) : paginatedVendors.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No vendors found matching your criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedVendors.map((vendor) => {
                const metrics = vendor.metrics?.[0] || {};
                return (
                  <div
                    key={vendor.id}
                    onClick={() => handleVendorClick(vendor.id)}
                    className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer transform transition-transform hover:scale-105"
                  >
                    <div className="relative h-48 bg-gradient-to-br from-yellow-100 to-yellow-200 flex items-center justify-center">
                      {vendor.logo_url ? (
                        <img
                          src={vendor.logo_url}
                          alt={vendor.business_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Store className="h-20 w-20 text-yellow-500" />
                      )}
                      {metrics.rating && (
                        <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full shadow-md flex items-center">
                          {renderStars(metrics.rating)}
                          <span className="ml-1 text-sm font-medium text-gray-700">
                            {metrics.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {vendor.business_name}
                      </h3>
                      
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {vendor.description}
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <MapPin className="h-4 w-4 mr-2" />
                          {vendor.location || 'Location not specified'}
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500">
                          <Package className="h-4 w-4 mr-2" />
                          {metrics.total_orders || 0} orders completed
                        </div>

                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-2" />
                          Avg. delivery: {metrics.average_delivery_time || 'N/A'}
                        </div>

                        <div className="flex items-center text-sm text-green-600">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          ₦{(metrics.total_revenue || 0).toLocaleString()} total revenue
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorShops;
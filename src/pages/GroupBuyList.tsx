import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown } from 'lucide-react';
import { useGroupBuyStore } from '../store/groupBuyStore';
import { GroupBuyCard } from '../components/GroupBuyCard';
import { Pagination } from '../components/Pagination';
import { MainMenu } from '../components/MainMenu';

const ITEMS_PER_PAGE = 12;

const GroupBuyList = () => {
  const navigate = useNavigate();
  const { groupBuys, isLoading, error, fetchGroupBuys } = useGroupBuyStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [sortBy, setSortBy] = useState('endDate');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchGroupBuys();
  }, [fetchGroupBuys]);

  // Get unique values for filters
  const vendors = Array.from(new Set(groupBuys.map(gb => gb.product?.vendor?.business_name || 'Unknown')));
  const locations = Array.from(new Set(groupBuys.map(gb => gb.product?.vendor?.location || 'Unknown')));
  const categories = Array.from(new Set(groupBuys.map(gb => gb.product?.category || 'Unknown')));

  const filteredGroupBuys = groupBuys
    .filter(groupBuy => {
      const matchesSearch = (
        groupBuy.product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        groupBuy.product?.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        groupBuy.product?.vendor?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const matchesCategory = selectedCategory === 'all' || groupBuy.product?.category === selectedCategory;
      const matchesVendor = selectedVendor === 'all' || groupBuy.product?.vendor?.business_name === selectedVendor;
      const matchesLocation = selectedLocation === 'all' || groupBuy.product?.vendor?.location === selectedLocation;

      return matchesSearch && matchesCategory && matchesVendor && matchesLocation;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'endDate':
          return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
        case 'participants':
          return b.current_participants - a.current_participants;
        case 'priceAsc':
          return (a.product?.base_price || 0) - (b.product?.base_price || 0);
        case 'priceDesc':
          return (b.product?.base_price || 0) - (a.product?.base_price || 0);
        default:
          return 0;
      }
    });

  const totalPages = Math.ceil(filteredGroupBuys.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedGroupBuys = filteredGroupBuys.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-gray-50">
      <MainMenu />
      
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Active Group Buys</h1>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col space-y-4 mb-8">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search group buys, vendors, or descriptions..."
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
                <option value="endDate">Sort by End Date</option>
                <option value="participants">Most Popular</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
              </select>
            </div>

            {/* Collapsible Filters */}
            {showFilters && (
              <div className="bg-white p-4 rounded-lg shadow-sm space-y-4 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                    >
                      <option value="all">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                    <select
                      value={selectedVendor}
                      onChange={(e) => setSelectedVendor(e.target.value)}
                      className="w-full rounded-lg border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                    >
                      <option value="all">All Vendors</option>
                      {vendors.map(vendor => (
                        <option key={vendor} value={vendor}>{vendor}</option>
                      ))}
                    </select>
                  </div>

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
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setSelectedCategory('all');
                      setSelectedVendor('all');
                      setSelectedLocation('all');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Clear all filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Group Buys Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 py-12">
              {error}
            </div>
          ) : paginatedGroupBuys.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              No active group buys found matching your criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {paginatedGroupBuys.map((groupBuy) => (
                <GroupBuyCard key={groupBuy.id} groupBuy={groupBuy} />
              ))}
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

export default GroupBuyList;
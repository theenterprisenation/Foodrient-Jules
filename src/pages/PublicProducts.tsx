import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Search, ShoppingCart, Filter, ChevronDown, Trash2, MapPin, Calendar } from 'lucide-react';
import { useProductStore } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useAdvertisementStore } from '../store/advertisementStore';
import type { Product } from '../types';
import { Advertisement } from '../components/Advertisement';
import { Pagination } from '../components/Pagination';

const ITEMS_PER_PAGE = 12;

const PublicProducts = () => {
  const navigate = useNavigate();
  const { products, isLoading, error, fetchProducts, deleteProduct, isAdmin } = useProductStore();
  const { addToCart } = useCartStore();
  const { ads, fetchAds } = useAdvertisementStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchAds('products');
  }, [fetchProducts, fetchAds]);

  const handleAddToCart = (product: Product) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.base_price,
      quantity: product.min_quantity,
      unit: product.unit,
      image: product.image_url,
    });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(id);
    }
  };

  const handleVendorClick = (vendorId: string) => {
    navigate(`/shop/${vendorId}`);
  };

  // Get unique values for filters
  const vendors = Array.from(new Set(products.map(p => p.vendor?.business_name || 'Unknown')));
  const locations = Array.from(new Set(products.map(p => p.vendor_location || 'Unknown')));
  const dates = Array.from(new Set(products.map(p => p.share_date))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = (
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.vendor?.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesVendor = selectedVendor === 'all' || product.vendor?.business_name === selectedVendor;
      const matchesLocation = selectedLocation === 'all' || product.vendor_location === selectedLocation;
      const matchesDate = selectedDate === 'all' || product.share_date === selectedDate;

      return matchesSearch && matchesCategory && matchesVendor && matchesLocation && matchesDate;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.base_price - b.base_price;
        case 'price-desc':
          return b.base_price - a.base_price;
        case 'date-desc':
          return new Date(b.share_date).getTime() - new Date(a.share_date).getTime();
        case 'date-asc':
          return new Date(a.share_date).getTime() - new Date(b.share_date).getTime();
        case 'name':
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const categories = ['all', 'vegetables', 'fruits', 'grains', 'meat', 'seafood', 'oil'];

  const topAd = ads.find(ad => ad.position === 'top');
  const middleAd = ads.find(ad => ad.position === 'middle');
  const bottomAd = ads.find(ad => ad.position === 'bottom');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search and Filter Toggle */}
        <div className="flex flex-col space-y-4 mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search products, vendors, or descriptions..."
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
              <option value="name">Sort by Name</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
            </select>
          </div>

          {/* Collapsible Filters */}
          {showFilters && (
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-3 py-1 rounded-full text-sm ${
                          selectedCategory === category
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    ))}
                  </div>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Share Date</label>
                  <select
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full rounded-lg border-gray-300 focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="all">All Dates</option>
                    {dates.map(date => (
                      <option key={date} value={date}>{formatDate(date)}</option>
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
                    setSelectedDate('all');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Top Advertisement */}
        {topAd && (
          <div className="mb-8">
            <Advertisement ad={topAd} />
          </div>
        )}

        {/* Product Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : error ? (
            <div className="col-span-full text-center text-red-600 py-12">
              {error}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-12">
              No products found matching your criteria.
            </div>
          ) : (
            <>
              {paginatedProducts.map((product, index) => {
                const showMiddleAd = index === Math.floor(ITEMS_PER_PAGE / 2) && middleAd;

                return (
                  <React.Fragment key={product.id}>
                    {showMiddleAd && (
                      <div className="col-span-full mb-6">
                        <Advertisement ad={middleAd} />
                      </div>
                    )}
                    <div className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {product.category}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{product.description}</p>
                        <div className="mt-4 space-y-2">
                          <button
                            onClick={() => product.vendor && handleVendorClick(product.vendor.id)}
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            {product.vendor?.business_name}
                          </button>
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPin className="h-4 w-4 mr-1" />
                            {product.vendor_location}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(product.share_date)}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Package className="h-4 w-4 mr-2" />
                            Available: {product.available_quantity} {product.unit}
                          </div>
                          <div className="text-sm text-gray-500">
                            Min Order: {product.min_quantity} {product.unit}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-xl font-bold text-yellow-600">
                            ₦{product.base_price.toLocaleString()}/{product.unit}
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                        <button
                          onClick={() => handleAddToCart(product)}
                          className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>

        {/* Bottom Advertisement */}
        {bottomAd && (
          <div className="mt-8 mb-8">
            <Advertisement ad={bottomAd} />
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
  );
};

export default PublicProducts;
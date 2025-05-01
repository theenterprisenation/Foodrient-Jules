import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Store, 
  Star, 
  MapPin, 
  Package, 
  Trash2, 
  AlertTriangle, 
  CheckCircle,
  Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';

interface FavoriteVendor {
  id: string;
  user_id: string;
  vendor_id: string;
  created_at: string;
  vendor: {
    id: string;
    business_name: string;
    description: string | null;
    logo_url: string | null;
    status: string;
    location: string | null;
    product_count: number;
    rating: number;
  };
}

const CustomerFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteVendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('favorite_vendors')
        .select(`
          *,
          vendor:vendors(
            id,
            business_name,
            description,
            logo_url,
            status,
            location:vendor_locations(address)
          )
        `);
        
      if (error) throw error;
      
      // Fetch product counts for each vendor
      const vendorIds = data?.map(fav => fav.vendor_id) || [];
      
      const { data: productCounts, error: productsError } = await supabase
        .from('products')
        .select('vendor_id, count')
        .in('vendor_id', vendorIds)
        .select('vendor_id')
        .select('*');
        
      if (productsError) throw productsError;
      
      // Count products per vendor
      const productCountMap = {};
      productCounts?.forEach(product => {
        productCountMap[product.vendor_id] = (productCountMap[product.vendor_id] || 0) + 1;
      });
      
      // Fetch vendor ratings
      const { data: vendorMetrics, error: metricsError } = await supabase
        .from('vendor_metrics')
        .select('vendor_id, rating')
        .in('vendor_id', vendorIds);
        
      if (metricsError) throw metricsError;
      
      // Create ratings map
      const ratingsMap = {};
      vendorMetrics?.forEach(metric => {
        ratingsMap[metric.vendor_id] = metric.rating;
      });
      
      // Process favorites with additional data
      const processedFavorites = data?.map(favorite => ({
        ...favorite,
        vendor: {
          ...favorite.vendor,
          product_count: productCountMap[favorite.vendor_id] || 0,
          rating: ratingsMap[favorite.vendor_id] || 0,
          location: favorite.vendor.location?.[0]?.address || 'Location not specified'
        }
      })) || [];
      
      setFavorites(processedFavorites);
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this vendor from your favorites?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('favorite_vendors')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccessMessage('Vendor removed from favorites');
      fetchFavorites();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      setError(error.message);
    }
  };

  const filteredFavorites = favorites.filter(favorite => 
    favorite.vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (favorite.vendor.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Favorite Vendors</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search favorites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
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

      {/* Favorites Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : filteredFavorites.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Favorite Vendors</h3>
          <p className="text-gray-500 mb-4">
            You haven't added any vendors to your favorites yet.
          </p>
          <Link
            to="/vendors"
            className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            <Store className="h-5 w-5 mr-2" />
            Browse Vendors
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFavorites.map((favorite) => (
            <div key={favorite.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
              <div className="relative h-40 bg-gradient-to-r from-yellow-100 to-yellow-200">
                {favorite.vendor.logo_url ? (
                  <img 
                    src={favorite.vendor.logo_url} 
                    alt={favorite.vendor.business_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Store className="h-16 w-16 text-yellow-500" />
                  </div>
                )}
                <button
                  onClick={() => handleRemoveFavorite(favorite.id)}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full text-red-500 hover:text-red-600 shadow-sm"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{favorite.vendor.business_name}</h3>
                <div className="flex items-center mb-2">
                  {renderStars(favorite.vendor.rating)}
                  <span className="ml-2 text-sm text-gray-600">
                    {favorite.vendor.rating.toFixed(1)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {favorite.vendor.description || 'No description available'}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {favorite.vendor.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Package className="h-4 w-4 mr-2" />
                    {favorite.vendor.product_count} products
                  </div>
                </div>
                
                <Link
                  to={`/shop/${favorite.vendor_id}`}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600"
                >
                  <Store className="h-4 w-4 mr-2" />
                  Visit Shop
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerFavorites;
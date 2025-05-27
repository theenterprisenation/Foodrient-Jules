import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Search, 
  Filter, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  Package, 
  Edit, 
  Trash2,
  Store
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useMinimalAuth } from '../../hooks/useMinimalAuth';

interface Review {
  id: string;
  order_id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  vendor_response: string | null;
  response_at: string | null;
  product: {
    name: string;
    image_url: string | null;
    vendor: {
      id: string;
      business_name: string;
    };
  };
}

const CustomerReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const { user, isLoading: authLoading } = useMinimalAuth();

  useEffect(() => {
    if (user) {
      fetchReviews();
    }
  }, [user]);

  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!user) throw new Error('User not authenticated');
      
      // First, get the product reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (reviewsError) throw reviewsError;
      
      if (!reviewsData || reviewsData.length === 0) {
        setReviews([]);
        setIsLoading(false);
        return;
      }
      
      // Get product IDs from reviews
      const productIds = reviewsData.map(review => review.product_id);
      
      // Fetch product details separately
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          image_url,
          vendor_id
        `)
        .in('id', productIds);
        
      if (productsError) throw productsError;
      
      // Create a map of products for quick lookup
      const productsMap = new Map();
      productsData?.forEach(product => {
        productsMap.set(product.id, product);
      });
      
      // Get vendor IDs from products
      const vendorIds = productsData?.map(product => product.vendor_id).filter(Boolean) || [];
      
      // Fetch vendor details separately
      const { data: vendorsData, error: vendorsError } = await supabase
        .from('vendors')
        .select('id, business_name')
        .in('id', vendorIds);
        
      if (vendorsError) throw vendorsError;
      
      // Create a map of vendors for quick lookup
      const vendorsMap = new Map();
      vendorsData?.forEach(vendor => {
        vendorsMap.set(vendor.id, vendor);
      });
      
      // Combine all data
      const processedReviews = reviewsData.map(review => {
        const product = productsMap.get(review.product_id);
        const vendor = product ? vendorsMap.get(product.vendor_id) : null;
        
        return {
          ...review,
          product: {
            name: product?.name || 'Unknown Product',
            image_url: product?.image_url,
            vendor: vendor ? {
              id: vendor.id,
              business_name: vendor.business_name
            } : {
              id: '',
              business_name: 'Unknown Vendor'
            }
          }
        };
      });
        
      setReviews(processedReviews);
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditReview = (review: Review) => {
    setSelectedReview(review);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
    setIsEditing(true);
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setSuccessMessage('Review deleted successfully');
      fetchReviews();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error deleting review:', error);
      setError(error.message);
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedReview) return;
    
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({
          rating: editRating,
          comment: editComment
        })
        .eq('id', selectedReview.id);
        
      if (error) throw error;
      
      setSuccessMessage('Review updated successfully');
      fetchReviews();
      setIsEditing(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating review:', error);
      setError(error.message);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product.vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRating = selectedRating === 'all' || review.rating === selectedRating;
    
    return matchesSearch && matchesRating;
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <Star
        key={index}
        className={`h-4 w-4 ${
          index < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const renderEditableStars = () => {
    return Array.from({ length: 5 }).map((_, index) => (
      <button
        key={index}
        type="button"
        onClick={() => setEditRating(index + 1)}
        className="focus:outline-none"
      >
        <Star
          className={`h-6 w-6 ${
            index < editRating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
        />
      </button>
    ));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search reviews..."
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
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm animate-fadeIn">
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Rating</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedRating('all')}
              className={`px-3 py-1 rounded-md ${
                selectedRating === 'all' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map(rating => (
              <button
                key={rating}
                onClick={() => setSelectedRating(rating)}
                className={`px-3 py-1 rounded-md ${
                  selectedRating === rating ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {rating} ★
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedRating !== 'all'
              ? 'No reviews match your search criteria.'
              : 'You haven\'t written any reviews yet.'}
          </p>
          <Link
            to="/products"
            className="inline-flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            <Package className="h-5 w-5 mr-2" />
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    {review.product.image_url ? (
                      <img 
                        src={review.product.image_url} 
                        alt={review.product.name} 
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{review.product.name}</h3>
                      <Link 
                        to={`/shop/${review.product.vendor.id}`}
                        className="text-sm text-yellow-600 hover:text-yellow-700"
                      >
                        {review.product.vendor.business_name}
                      </Link>
                      <div className="flex items-center mt-1">
                        {renderStars(review.rating)}
                        <span className="ml-2 text-sm text-gray-500">
                          {formatDate(review.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditReview(review)}
                      className="text-gray-400 hover:text-yellow-600"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-gray-700">{review.comment || 'No comment provided'}</p>
                </div>
                
                {review.vendor_response && (
                  <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Store className="h-5 w-5 text-yellow-600 mr-2" />
                      <h4 className="text-sm font-medium text-gray-900">Vendor Response</h4>
                    </div>
                    <p className="text-sm text-gray-700">{review.vendor_response}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {review.response_at ? `Responded on ${formatDate(review.response_at)}` : ''}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Review Modal */}
      {isEditing && selectedReview && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Your Review</h3>
            
            <div className="mb-4">
              <div className="flex items-center">
                {selectedReview.product.image_url ? (
                  <img 
                    src={selectedReview.product.image_url} 
                    alt={selectedReview.product.name} 
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                )}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{selectedReview.product.name}</p>
                  <p className="text-xs text-gray-500">{selectedReview.product.vendor.business_name}</p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmitEdit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex space-x-1">
                  {renderEditableStars()}
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Review</label>
                <textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                  placeholder="Share your experience with this product..."
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  Update Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerReviews;
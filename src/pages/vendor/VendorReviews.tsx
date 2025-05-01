import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Search, 
  Filter, 
  ChevronDown, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown, 
  User,
  Calendar,
  TrendingUp,
  BarChart,
  Store
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

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
  };
  user: {
    full_name: string;
    email: string;
  };
}

const VendorReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [products, setProducts] = useState<{id: string; name: string}[]>([]);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const [response, setResponse] = useState('');
  const [metrics, setMetrics] = useState({
    averageRating: 0,
    totalReviews: 0,
    responseRate: 0,
    ratingDistribution: [
      { rating: 5, count: 0 },
      { rating: 4, count: 0 },
      { rating: 3, count: 0 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 }
    ],
    ratingTrend: []
  });

  useEffect(() => {
    fetchVendorId();
  }, []);

  useEffect(() => {
    if (vendorId) {
      fetchReviews();
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
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name')
        .eq('vendor_id', vendorId)
        .eq('status', 'active');
        
      if (error) throw error;
      
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch reviews for this vendor's products
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('product_reviews')
        .select(`
          *,
          product:products(
            name,
            vendor_id
          ),
          user:profiles(
            full_name,
            email:auth.users!profiles_id_fkey(email)
          )
        `)
        .eq('product.vendor_id', vendorId)
        .order('created_at', { ascending: false });
        
      if (reviewsError) throw reviewsError;
      
      // Process reviews
      const processedReviews = reviewsData?.map(review => ({
        ...review,
        user: {
          ...review.user,
          email: review.user?.email?.[0]?.email || 'N/A'
        }
      }));
      
      setReviews(processedReviews || []);
      
      // Calculate metrics
      if (processedReviews && processedReviews.length > 0) {
        // Average rating
        const totalRating = processedReviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = totalRating / processedReviews.length;
        
        // Response rate
        const respondedReviews = processedReviews.filter(review => review.vendor_response !== null);
        const responseRate = (respondedReviews.length / processedReviews.length) * 100;
        
        // Rating distribution
        const distribution = [5, 4, 3, 2, 1].map(rating => ({
          rating,
          count: processedReviews.filter(review => review.rating === rating).length
        }));
        
        // Rating trend (by month)
        const reviewsByMonth = processedReviews.reduce((acc, review) => {
          const month = format(new Date(review.created_at), 'MMM yyyy');
          if (!acc[month]) {
            acc[month] = {
              month,
              count: 0,
              totalRating: 0
            };
          }
          acc[month].count += 1;
          acc[month].totalRating += review.rating;
          return acc;
        }, {});
        
        const trend = Object.values(reviewsByMonth).map((data: any) => ({
          month: data.month,
          rating: data.totalRating / data.count
        }));
        
        setMetrics({
          averageRating,
          totalReviews: processedReviews.length,
          responseRate,
          ratingDistribution: distribution,
          ratingTrend: trend
        });
      }
    } catch (error: any) {
      console.error('Error fetching reviews:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedReview || !response.trim()) return;
    
    try {
      const { error } = await supabase
        .from('product_reviews')
        .update({
          vendor_response: response,
          response_at: new Date().toISOString()
        })
        .eq('id', selectedReview.id);
        
      if (error) throw error;
      
      setSuccessMessage('Response submitted successfully');
      fetchReviews();
      setIsResponding(false);
      setResponse('');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error submitting response:', error);
      setError(error.message);
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.user.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesRating = selectedRating === 'all' || review.rating === selectedRating;
    const matchesProduct = selectedProduct === 'all' || review.product_id === selectedProduct;
    
    return matchesSearch && matchesRating && matchesProduct;
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Customer Reviews</h1>
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

      {/* Review Metrics */}
      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <Star className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Average Rating</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.averageRating.toFixed(1)}/5.0</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Reviews</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.totalReviews}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <ThumbsUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Response Rate</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.responseRate.toFixed(0)}%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">5-Star Reviews</p>
              <p className="text-2xl font-semibold text-gray-900">
                {metrics.ratingDistribution.find(d => d.rating === 5)?.count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Rating Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Rating Distribution</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={metrics.ratingDistribution}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="rating" type="category" />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#F59E0B" name="Number of Reviews" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Rating Trend */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Rating Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={metrics.ratingTrend}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="rating" stroke="#F59E0B" name="Average Rating" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg shadow-sm animate-fadeIn">
          <div>
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="all">All Products</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Customer Reviews</h3>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No reviews found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredReviews.map((review) => (
              <div key={review.id} className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-6 w-6 text-gray-500" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{review.user.full_name}</h4>
                        <div className="flex items-center mt-1">
                          {renderStars(review.rating)}
                          <span className="ml-2 text-sm text-gray-500">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {review.product.name}
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">{review.comment || 'No comment provided'}</p>
                    </div>
                    
                    {review.vendor_response && (
                      <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                              <Store className="h-4 w-4 text-yellow-600" />
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-xs font-medium text-gray-900">Vendor Response</p>
                            <p className="text-xs text-gray-500">
                              {review.response_at ? formatDate(review.response_at) : ''}
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-700">{review.vendor_response}</p>
                      </div>
                    )}
                    
                    {!review.vendor_response && (
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            setSelectedReview(review);
                            setIsResponding(true);
                          }}
                          className="text-sm text-yellow-600 hover:text-yellow-700"
                        >
                          Respond to review
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Response Modal */}
      {isResponding && selectedReview && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Respond to Review</h3>
            
            <div className="mb-4 bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedReview.user.full_name}</p>
                  <div className="flex items-center mt-1">
                    {renderStars(selectedReview.rating)}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {selectedReview.product.name}
                </div>
              </div>
              
              <div className="mt-2">
                <p className="text-sm text-gray-700">{selectedReview.comment || 'No comment provided'}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Response</label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                placeholder="Type your response here..."
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsResponding(false);
                  setResponse('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitResponse}
                disabled={!response.trim()}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorReviews;
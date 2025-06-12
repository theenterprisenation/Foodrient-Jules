import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Heart, 
  Star, 
  Share2, 
  Wallet, 
  Clock, 
  Package,
  ArrowRight,
  Calendar,
  AlertCircle,
  Store,
  Truck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface CustomerOverviewProps {
  userId?: string;
}

const CustomerOverview = ({ userId }: CustomerOverviewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState({
    recentOrders: [],
    orderCount: 0,
    favoriteVendors: [],
    reviewCount: 0,
    referralCount: 0,
    pepsBalance: 0,
    pendingDeliveries: []
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Silently return if userId is not available
        if (!userId) {
          setIsLoading(false);
          return;
        }

        // Fetch all data in parallel for better performance
        const [
          ordersQuery,
          orderCountQuery,
          favoritesQuery,
          reviewCountQuery,
          referralCountQuery,
          profileQuery,
          deliveriesQuery
        ] = await Promise.all([
          supabase
            .from('orders')
            .select(`
              id,
              total_amount,
              status,
              payment_status,
              created_at,
              delivery_type,
              order_items:order_items(
                product:products(
                  name,
                  image_url
                )
              )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('favorite_vendors')
            .select(`
              vendor:vendors(
                id,
                business_name,
                logo_url
              )
            `)
            .eq('user_id', userId)
            .limit(4),
          supabase
            .from('product_reviews')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('referrals')
            .select('id', { count: 'exact', head: true })
            .eq('referrer_id', userId),
          supabase
            .from('profiles')
            .select('points_balance')
            .eq('id', userId)
            .maybeSingle(), // Use maybeSingle() instead of single() to handle empty results
          supabase
            .from('delivery_tracking')
            .select(`
              id,
              status,
              created_at,
              order:orders(
                id,
                delivery_type
              )
            `)
            .in('status', ['scheduled', 'in_progress'])
            .eq('order.user_id', userId)
            .order('created_at', { ascending: false })
            .limit(3)
        ]);

        // Check for errors in each query
        const queries = [
          { name: 'orders', ...ordersQuery },
          { name: 'orderCount', ...orderCountQuery },
          { name: 'favorites', ...favoritesQuery },
          { name: 'reviewCount', ...reviewCountQuery },
          { name: 'referralCount', ...referralCountQuery },
          { name: 'profile', ...profileQuery },
          { name: 'deliveries', ...deliveriesQuery }
        ];

        const errors = queries
          .filter(q => q.error && !(q.name === 'profile' && q.error.code === 'PGRST116')) // Ignore profile not found error
          .map(q => ({ name: q.name, error: q.error }));

        if (errors.length > 0) {
          console.error('Supabase query errors:', errors);
          throw new Error(`Failed to load some dashboard data: ${errors[0].error.message}`);
        }

        setDashboardData({
          recentOrders: ordersQuery.data || [],
          orderCount: orderCountQuery.count || 0,
          favoriteVendors: favoritesQuery.data?.map(f => f.vendor) || [],
          reviewCount: reviewCountQuery.count || 0,
          referralCount: referralCountQuery.count || 0,
          pepsBalance: profileQuery.data?.points_balance || 0, // Safe access with optional chaining
          pendingDeliveries: deliveriesQuery.data || []
        });
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data');
        
        // Set empty data if API fails
        setDashboardData({
          recentOrders: [],
          orderCount: 0,
          favoriteVendors: [],
          reviewCount: 0,
          referralCount: 0,
          pepsBalance: 0,
          pendingDeliveries: []
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [userId]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!userId) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Sign in required</h2>
          <p className="text-gray-600 mb-6">Please sign in to view your customer dashboard</p>
          <Link
            to="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 mr-4">
                  <ShoppingBag className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Orders</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.orderCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 mr-4">
                  <Star className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Reviews Given</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.reviewCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 mr-4">
                  <Share2 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Referrals</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.referralCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 mr-4">
                  <Wallet className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">PEPS Balance</p>
                  <p className="text-2xl font-semibold text-gray-900">{dashboardData.pepsBalance}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">Recent Orders</h2>
              <Link to="/customer/orders" className="text-sm text-yellow-600 hover:text-yellow-700 flex items-center">
                View all orders
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            
            {dashboardData.recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p>You haven't placed any orders yet</p>
                <Link to="/products" className="mt-2 inline-block text-yellow-600 hover:text-yellow-700">
                  Browse products
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.recentOrders.map((order: any) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">#{order.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">₦{order.total_amount.toLocaleString()}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {order.delivery_type}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Favorite Vendors */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Favorite Vendors</h2>
                <Link to="/customer/favorites" className="text-sm text-yellow-600 hover:text-yellow-700 flex items-center">
                  View all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
              
              {dashboardData.favoriteVendors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p>You don't have any favorite vendors yet</p>
                  <Link to="/vendors" className="mt-2 inline-block text-yellow-600 hover:text-yellow-700">
                    Browse vendors
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {dashboardData.favoriteVendors.map((vendor: any) => (
                    <div key={vendor.id} className="bg-gray-50 rounded-lg p-4 flex items-center">
                      {vendor.logo_url ? (
                        <img 
                          src={vendor.logo_url} 
                          alt={vendor.business_name} 
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Store className="h-5 w-5 text-yellow-600" />
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 truncate">{vendor.business_name}</p>
                        <Link to={`/shop/${vendor.id}`} className="text-xs text-yellow-600 hover:text-yellow-700">
                          Visit shop
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Pending Deliveries */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Pending Deliveries</h2>
                <Link to="/customer/orders" className="text-sm text-yellow-600 hover:text-yellow-700 flex items-center">
                  Track orders
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
              
              {dashboardData.pendingDeliveries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p>No pending deliveries</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dashboardData.pendingDeliveries.map((delivery: any) => (
                    <div key={delivery.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            Order #{delivery.order.id.slice(0, 8)}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          delivery.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {delivery.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(delivery.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PEPS Section */}
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center mb-4">
              <Wallet className="h-8 w-8 mr-3" />
              <h2 className="text-xl font-bold">PEPS Balance</h2>
            </div>
            <div className="text-4xl font-bold mb-4">{dashboardData.pepsBalance.toLocaleString()}</div>
            <div className="text-sm opacity-80">
              1 PEPS = ₦1 | Can be used for purchases on Foodrient
            </div>
            <div className="mt-6 flex items-center">
              <ArrowRight className="h-5 w-5 mr-2" />
              <span className="text-sm">Use your PEPS at checkout for discounts</span>
            </div>
            <div className="mt-4">
              <Link 
                to="/customer/peps" 
                className="inline-block px-4 py-2 bg-white text-yellow-600 rounded-md hover:bg-yellow-50 transition-colors"
              >
                Manage PEPS
              </Link>
            </div>
          </div>

          {/* Referral Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 rounded-full bg-blue-100 mr-4">
                <Share2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Referral Program</h2>
                <p className="text-sm text-gray-500">Earn PEPS by referring friends to Foodrient</p>
              </div>
            </div>
            
            <div className="mt-4">
              <Link 
                to="/customer/referrals" 
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Your Referral Link
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerOverview;
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
  Truck,
  Store,
  Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

const CustomerOverview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkAuthAndFetchData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (!mounted) return;

        if (authError || !user) {
          setIsAuthenticated(false);
          navigate('/login', { replace: true });
          return;
        }

        setIsAuthenticated(true);
        await fetchDashboardData(user.id);
      } catch (error) {
        if (!mounted) return;
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      } finally {
        if (mounted) {
          setIsLoading(false);
        setError(null);
        }
      }
    };

    checkAuthAndFetchData();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const fetchDashboardData = async (userId: string) => {
    setIsLoading(true);
    
    try {
      // Fetch all data in parallel for better performance
      const [
        { data: orders, error: ordersError },
        { count: orderCount, error: countError },
        { data: favorites, error: favoritesError },
        { count: reviewCount, error: reviewCountError },
        { count: referralCount, error: referralCountError },
        { data: profile, error: profileError },
        { data: deliveries, error: deliveriesError }
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
          .single(),
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

      // Check for errors
      const errors = [
        ordersError,
        countError,
        favoritesError,
        reviewCountError,
        referralCountError,
        profileError,
        deliveriesError
      ].filter(Boolean);

      if (errors.length > 0) {
        throw new Error('Failed to load some dashboard data');
      }

      setDashboardData({
        recentOrders: orders || [],
        orderCount: orderCount || 0,
        favoriteVendors: favorites?.map(f => f.vendor) || [],
        reviewCount: reviewCount || 0,
        referralCount: referralCount || 0,
        pepsBalance: profile?.points_balance || 0,
        pendingDeliveries: deliveries || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-yellow-500 mb-4" />
        <p className="text-gray-600">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      {/* Error Message - Only shown for data loading errors, not auth errors */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-500" />
        </div>
      ) : (
        <>
          {/* Rest of your component remains the same */}
          {/* Key Metrics */}
          <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* ... existing metrics code ... */}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            {/* ... existing orders code ... */}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Favorite Vendors */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* ... existing vendors code ... */}
            </div>
            
            {/* Pending Deliveries */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* ... existing deliveries code ... */}
            </div>
          </div>

          {/* PEPS Section */}
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 mb-8 text-white">
            {/* ... existing PEPS code ... */}
          </div>

          {/* Referral Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* ... existing referral code ... */}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerOverview;
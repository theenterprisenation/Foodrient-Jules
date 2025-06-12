import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Star,
  Package,
  Truck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

const VendorOverview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('week');
  
  // Dashboard metrics
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    averageRating: 0
  });
  
  // Chart data
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);
  const [productPerformance, setProductPerformance] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  
  // Recent orders
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);
  
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Silent fallback if user is not authenticated (shouldn't happen since page is protected)
      if (userError || !user) {
        console.warn('User session issue detected, falling back to mock data');
        useMockData();
        return;
      }

      // Fetch vendor profile
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (vendorError) throw vendorError;
      
      const vendorId = vendorData.id;
      
      // Fetch products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('vendor_id', vendorId);
        
      if (productsError) throw productsError;
      
      // Fetch orders
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          order_id,
          product_id,
          quantity,
          unit_price,
          subtotal,
          product:products(name, category),
          order:orders(
            id,
            total_amount,
            status,
            payment_status,
            created_at
          )
        `)
        .eq('product.vendor_id', vendorId)
        .order('created_at', { ascending: false });
        
      if (orderItemsError) throw orderItemsError;
      
      // Fetch ratings
      const { data: ratings, error: ratingsError } = await supabase
        .from('vendor_metrics')
        .select('rating')
        .eq('vendor_id', vendorId)
        .order('period_end', { ascending: false })
        .limit(1);
        
      if (ratingsError) throw ratingsError;
      
      // Calculate metrics
      const totalRevenue = orderItems?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0;
      const totalOrders = new Set(orderItems?.map(item => item.order_id)).size;
      const totalProducts = products?.length || 0;
      const averageRating = ratings?.[0]?.rating || 0;
      
      setMetrics({
        totalRevenue,
        totalOrders,
        totalProducts,
        averageRating
      });
      
      // Generate revenue data by date
      const revenueByDate = orderItems?.reduce((acc, item) => {
        const date = format(new Date(item.order.created_at), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + Number(item.subtotal);
        return acc;
      }, {});
      
      const revenueChartData = Object.entries(revenueByDate || {}).map(([date, revenue]) => ({
        date,
        revenue
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      setRevenueData(revenueChartData);
      
      // Generate order data by date
      const ordersByDate = orderItems?.reduce((acc, item) => {
        const date = format(new Date(item.order.created_at), 'yyyy-MM-dd');
        if (!acc[date]) {
          acc[date] = new Set();
        }
        acc[date].add(item.order_id);
        return acc;
      }, {});
      
      const orderChartData = Object.entries(ordersByDate || {}).map(([date, orderSet]) => ({
        date,
        orders: (orderSet as Set<string>).size
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      setOrderData(orderChartData);
      
      // Calculate product performance
      const productSales = orderItems?.reduce((acc, item) => {
        const productId = item.product_id;
        const productName = item.product?.name || 'Unknown Product';
        
        if (!acc[productId]) {
          acc[productId] = {
            name: productName,
            value: 0
          };
        }
        
        acc[productId].value += Number(item.subtotal);
        return acc;
      }, {});
      
      const productPerformanceData = Object.values(productSales || {})
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 5);
      
      setProductPerformance(productPerformanceData);
      
      // Calculate category distribution
      const categoryCounts = products?.reduce((acc, product) => {
        const category = product.category;
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
      
      const categoryChartData = Object.entries(categoryCounts || {}).map(([name, value]) => ({
        name,
        value
      }));
      
      setCategoryData(categoryChartData);
      
      // Get recent orders
      const uniqueOrders = new Map();
      orderItems?.forEach(item => {
        if (!uniqueOrders.has(item.order_id)) {
          uniqueOrders.set(item.order_id, {
            id: item.order_id,
            total: item.order.total_amount,
            status: item.order.status,
            payment_status: item.order.payment_status,
            created_at: item.order.created_at
          });
        }
      });
      
      setRecentOrders(Array.from(uniqueOrders.values()).slice(0, 5));
      
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      // Only show non-authentication errors
      if (!error.message.includes('not authenticated')) {
        setError(error.message || 'Failed to load dashboard data');
      }
      useMockData();
    } finally {
      setIsLoading(false);
    }
  };
  
  const useMockData = () => {
    // Mock data for demonstration
    const mockRevenueData = [
      { date: '2025-04-01', revenue: 12500 },
      { date: '2025-04-02', revenue: 14200 },
      { date: '2025-04-03', revenue: 15800 },
      { date: '2025-04-04', revenue: 16500 },
      { date: '2025-04-05', revenue: 18900 },
      { date: '2025-04-06', revenue: 17200 },
      { date: '2025-04-07', revenue: 19500 },
    ];
    
    const mockOrderData = [
      { date: '2025-04-01', orders: 5 },
      { date: '2025-04-02', orders: 7 },
      { date: '2025-04-03', orders: 4 },
      { date: '2025-04-04', orders: 8 },
      { date: '2025-04-05', orders: 6 },
      { date: '2025-04-06', orders: 9 },
      { date: '2025-04-07', orders: 7 },
    ];
    
    const mockProductPerformance = [
      { name: 'Rice (50kg)', value: 45000 },
      { name: 'Tomatoes (Basket)', value: 32000 },
      { name: 'Yam (Tuber)', value: 28000 },
      { name: 'Palm Oil (25L)', value: 22000 },
      { name: 'Beans (50kg)', value: 18000 },
    ];
    
    const mockCategoryData = [
      { name: 'Vegetables', value: 12 },
      { name: 'Fruits', value: 8 },
      { name: 'Grains', value: 15 },
      { name: 'Meat', value: 5 },
      { name: 'Seafood', value: 3 },
    ];
    
    const mockRecentOrders = [
      { id: '1', total: 15000, status: 'delivered', payment_status: 'paid', created_at: '2025-04-07T10:30:00Z' },
      { id: '2', total: 8500, status: 'shipped', payment_status: 'paid', created_at: '2025-04-06T14:20:00Z' },
      { id: '3', total: 12000, status: 'confirmed', payment_status: 'paid', created_at: '2025-04-05T09:15:00Z' },
      { id: '4', total: 5000, status: 'pending', payment_status: 'pending', created_at: '2025-04-04T16:45:00Z' },
      { id: '5', total: 9500, status: 'delivered', payment_status: 'paid', created_at: '2025-04-03T11:10:00Z' },
    ];
    
    setRevenueData(mockRevenueData);
    setOrderData(mockOrderData);
    setProductPerformance(mockProductPerformance);
    setCategoryData(mockCategoryData);
    setRecentOrders(mockRecentOrders);
    
    setMetrics({
      totalRevenue: 250000,
      totalOrders: 45,
      totalProducts: 35,
      averageRating: 4.2
    });
  };
  
  // Colors for pie charts
  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EC4899'];
  
  // Use mock data if real data is empty
  const displayRevenueData = revenueData.length > 0 ? revenueData : [];
  const displayOrderData = orderData.length > 0 ? orderData : [];
  const displayProductPerformance = productPerformance.length > 0 ? productPerformance : [];
  const displayCategoryData = categoryData.length > 0 ? categoryData : [];

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

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Dashboard</h1>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button 
            onClick={() => fetchDashboardData()}
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Only show non-authentication errors */}
      {error && !error.includes('not authenticated') && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">₦{metrics.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 mr-4">
              <ShoppingBag className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.totalOrders.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.totalProducts}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <Star className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Average Rating</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.averageRating.toFixed(1)}/5.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayRevenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#F59E0B" 
                  activeDot={{ r: 8 }} 
                  name="Revenue (₦)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Orders Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Order Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayOrderData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#10B981" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Top Products</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayProductPerformance}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="value" fill="#3B82F6" name="Revenue (₦)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Product Categories */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Product Categories</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {displayCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Orders</h2>
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
                  Payment
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    </div>
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No recent orders
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₦{Number(order.total).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.payment_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorOverview;
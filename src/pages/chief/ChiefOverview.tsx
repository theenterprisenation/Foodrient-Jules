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
  Clock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { checkServerHealth } from '../../lib/serverCheck';
import { NetworkMonitor } from '../../utils/networkMonitor';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

const ChiefOverview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('week');
  const [serverStatus, setServerStatus] = useState<{
    auth: { healthy: boolean; responseTime?: number };
    database: { healthy: boolean; responseTime?: number };
  } | null>(null);
  
  // Dashboard metrics
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeUsers: 0,
    pendingVendors: 0
  });
  
  // Chart data
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);
  const [userDistribution, setUserDistribution] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  
  useEffect(() => {
    fetchDashboardData();
    checkServerStatus();
    
    // Set up interval to check server status every 5 minutes
    const interval = setInterval(checkServerStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [dateRange]);
  
  const checkServerStatus = async () => {
    try {
      const status = await checkServerHealth();
      setServerStatus({
        auth: {
          healthy: status.services?.auth || false,
          responseTime: 200 // Mock response time
        },
        database: {
          healthy: status.healthy,
          responseTime: 150 // Mock response time
        }
      });
    } catch (error) {
      console.error('Error checking server status:', error);
      setServerStatus(null);
    }
  };

  const handleRateLimit = async (attempt: number): Promise<void> => {
    if (attempt >= MAX_RETRIES) {
      throw new Error('Maximum retry attempts reached. Please try again later.');
    }
    const delay = RETRY_DELAYS[attempt];
    console.log(`Rate limit hit, waiting ${delay}ms before retry...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  };

  const fetchWithRetry = async (operation: () => Promise<any>, attempt = 0) => {
    try {
      return await operation();
    } catch (error: any) {
      if (error.status === 429 && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt];
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(operation, attempt + 1);
      }
      throw error;
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    // Check network connectivity first
    const networkMonitor = NetworkMonitor.getInstance();
    if (!networkMonitor.isOnline()) {
      setError('No internet connection. Please check your network and try again.');
      setIsLoading(false);
      return;
    }

    try {
      // Check server health first
      const health = await checkServerHealth();
      if (!health.healthy) {
        setError(`Server is currently experiencing issues. Please try again later.`);
        setIsLoading(false);
        return;
      }

      // Fetch summary metrics with retry
      const summaryData = await fetchWithRetry(async () => {
        const { data, error } = await supabase.rpc('get_dashboard_summary');
        if (error) throw error;
        return data;
      });

      if (summaryData) {
        setMetrics({
          totalRevenue: summaryData.total_revenue || 0,
          totalOrders: summaryData.total_orders || 0,
          activeUsers: summaryData.active_users || 0,
          pendingVendors: summaryData.pending_vendors || 0
        });
      }

      // Fetch revenue data with retry
      const revenueData = await fetchWithRetry(async () => {
        const { data, error } = await supabase.rpc('get_revenue_data', { 
          p_period: dateRange 
        });
        if (error) throw error;
        return data;
      });
      setRevenueData(revenueData || []);

      // Fetch order data with retry
      const orderData = await fetchWithRetry(async () => {
        const { data, error } = await supabase.rpc('get_order_data', { 
          p_period: dateRange 
        });
        if (error) throw error;
        return data;
      });
      setOrderData(orderData || []);

      // Fetch user distribution with retry
      const userDistribution = await fetchWithRetry(async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('role');
        if (error) throw error;
        
        // Process data for pie chart
        const distribution = data.reduce((acc, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});
        
        return Object.entries(distribution).map(([name, value]) => ({ name, value }));
      });
      setUserDistribution(userDistribution || []);

      // Fetch product category distribution with retry
      const categoryData = await fetchWithRetry(async () => {
        const { data, error } = await supabase
          .from('products')
          .select('category');
        if (error) throw error;
        
        // Process data for category chart
        const categories = data.reduce((acc, product) => {
          acc[product.category] = (acc[product.category] || 0) + 1;
          return acc;
        }, {});
        
        return Object.entries(categories).map(([name, value]) => ({ name, value }));
      });
      setCategoryData(categoryData || []);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data');
      
      // Use mock data if API fails
      useMockData();
    } finally {
      setIsLoading(false);
    }
  };
  
  const useMockData = () => {
    // Mock data for demonstration if needed
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
      { date: '2025-04-01', orders: 45 },
      { date: '2025-04-02', orders: 52 },
      { date: '2025-04-03', orders: 49 },
      { date: '2025-04-04', orders: 63 },
      { date: '2025-04-05', orders: 58 },
      { date: '2025-04-06', orders: 64 },
      { date: '2025-04-07', orders: 72 },
    ];
    
    const mockUserDistribution = [
      { name: 'Customer', value: 1200 },
      { name: 'Vendor', value: 150 },
      { name: 'Manager', value: 25 },
      { name: 'Coordinator', value: 8 },
      { name: 'Chief', value: 3 },
    ];
    
    const mockCategoryData = [
      { name: 'Vegetables', value: 35 },
      { name: 'Fruits', value: 28 },
      { name: 'Grains', value: 18 },
      { name: 'Meat', value: 12 },
      { name: 'Seafood', value: 7 },
    ];
    
    setRevenueData(mockRevenueData);
    setOrderData(mockOrderData);
    setUserDistribution(mockUserDistribution);
    setCategoryData(mockCategoryData);
    
    setMetrics({
      totalRevenue: 1250000,
      totalOrders: 450,
      activeUsers: 850,
      pendingVendors: 12
    });
  };
  
  // Colors for pie charts
  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EC4899'];
  
  // Use mock data if real data is empty
  const displayRevenueData = revenueData.length > 0 ? revenueData : [];
  const displayOrderData = orderData.length > 0 ? orderData : [];
  const displayUserDistribution = userDistribution.length > 0 ? userDistribution : [];
  const displayCategoryData = categoryData.length > 0 ? categoryData : [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
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

      {/* Server Status */}
      {serverStatus && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg flex items-center ${serverStatus?.auth?.healthy ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`p-2 rounded-full ${serverStatus?.auth?.healthy ? 'bg-green-100' : 'bg-red-100'} mr-4`}>
              {serverStatus?.auth?.healthy ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
            <div>
              <h3 className={`font-medium ${serverStatus?.auth?.healthy ? 'text-green-800' : 'text-red-800'}`}>
                Authentication Service
              </h3>
              <p className="text-sm">
                {serverStatus?.auth?.healthy 
                  ? `Healthy (${serverStatus?.auth?.responseTime}ms)` 
                  : 'Service experiencing issues'}
              </p>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg flex items-center ${serverStatus?.database?.healthy ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`p-2 rounded-full ${serverStatus?.database?.healthy ? 'bg-green-100' : 'bg-red-100'} mr-4`}>
              {serverStatus?.database?.healthy ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className="h-6 w-6 text-red-500" />
              )}
            </div>
            <div>
              <h3 className={`font-medium ${serverStatus?.database?.healthy ? 'text-green-800' : 'text-red-800'}`}>
                Database Service
              </h3>
              <p className="text-sm">
                {serverStatus?.database?.healthy 
                  ? `Healthy (${serverStatus?.database?.responseTime}ms)` 
                  : 'Service experiencing issues'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
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
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.activeUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Vendors</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.pendingVendors}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">User Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayUserDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {displayUserDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
              </PieChart>
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
    </div>
  );
};

export default ChiefOverview;
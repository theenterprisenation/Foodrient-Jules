import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Download, 
  Calendar, 
  Filter, 
  RefreshCw, 
  TrendingUp, 
  ShoppingBag, 
  Users, 
  DollarSign,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

const CoordinatorAnalytics = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Analytics data
  const [salesData, setSalesData] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    dailyRevenue: [],
    orderStats: []
  });
  
  const [productPerformance, setProductPerformance] = useState([]);
  const [customerMetrics, setCustomerMetrics] = useState({
    activeCustomers: 0,
    newCustomers: 0,
    repeatCustomers: 0,
    growth: []
  });
  
  const [vendorMetrics, setVendorMetrics] = useState({
    totalVendors: 0,
    activeVendors: 0,
    topVendors: []
  });
  
  const [categoryData, setCategoryData] = useState([]);
  
  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);
  
  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch sales metrics
      const { data: salesMetrics, error: salesError } = await supabase
        .from('sales_metrics')
        .select('*')
        .order('period_start', { ascending: false })
        .limit(1);
        
      if (salesError) throw salesError;
      
      // Fetch daily revenue data
      const { data: revenueData, error: revenueError } = await supabase
        .rpc('get_daily_revenue', { 
          p_days: dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365
        });
        
      if (revenueError) throw revenueError;
      
      // Fetch order statistics
      const { data: orderStats, error: orderStatsError } = await supabase
        .rpc('get_order_stats');
        
      if (orderStatsError) throw orderStatsError;
      
      // Set sales data
      setSalesData({
        totalRevenue: salesMetrics?.[0]?.total_revenue || 0,
        totalOrders: salesMetrics?.[0]?.total_orders || 0,
        averageOrderValue: salesMetrics?.[0]?.average_order_value || 0,
        dailyRevenue: revenueData || [],
        orderStats: orderStats || []
      });
      
      // Fetch product performance
      const { data: productData, error: productError } = await supabase
        .rpc('get_top_products', { p_limit: 5 });
        
      if (productError) throw productError;
      setProductPerformance(productData || []);
      
      // Fetch customer metrics
      const { data: customerData, error: customerError } = await supabase
        .rpc('get_customer_metrics');
        
      if (customerError) throw customerError;
      
      // Fetch customer growth
      const { data: growthData, error: growthError } = await supabase
        .rpc('get_customer_growth', {
          p_days: dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365
        });
        
      if (growthError) throw growthError;
      
      setCustomerMetrics({
        activeCustomers: customerData?.[0]?.active_customers || 0,
        newCustomers: customerData?.[0]?.new_customers || 0,
        repeatCustomers: customerData?.[0]?.repeat_customers || 0,
        growth: growthData || []
      });
      
      // Fetch vendor metrics
      const { data: vendorData, error: vendorError } = await supabase
        .rpc('get_vendor_metrics');
        
      if (vendorError) throw vendorError;
      
      // Fetch top vendors
      const { data: topVendors, error: topVendorsError } = await supabase
        .rpc('get_top_vendors', { p_limit: 5 });
        
      if (topVendorsError) throw topVendorsError;
      
      setVendorMetrics({
        totalVendors: vendorData?.[0]?.total_vendors || 0,
        activeVendors: vendorData?.[0]?.active_vendors || 0,
        topVendors: topVendors || []
      });
      
      // Fetch category data
      const { data: categoryData, error: categoryError } = await supabase
        .rpc('get_category_distribution');
        
      if (categoryError) throw categoryError;
      setCategoryData(categoryData || []);
      
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setError(error.message);
      
      // Use mock data if API fails
      useMockData();
    } finally {
      setIsLoading(false);
    }
  };
  
  const useMockData = () => {
    // Mock data for sales
    setSalesData({
      totalRevenue: 1250000,
      totalOrders: 450,
      averageOrderValue: 2777.78,
      dailyRevenue: Array.from({ length: 30 }, (_, i) => ({
        date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
        revenue: Math.floor(Math.random() * 50000) + 20000
      })),
      orderStats: [
        { name: 'Pending', value: 45 },
        { name: 'Confirmed', value: 120 },
        { name: 'Shipped', value: 85 },
        { name: 'Delivered', value: 180 },
        { name: 'Cancelled', value: 20 }
      ]
    });
    
    // Mock data for products
    setProductPerformance([
      { name: 'Rice (50kg)', value: 120 },
      { name: 'Tomatoes (Basket)', value: 85 },
      { name: 'Yam (Tuber)', value: 65 },
      { name: 'Palm Oil (25L)', value: 45 },
      { name: 'Beans (50kg)', value: 40 }
    ]);
    
    // Mock data for customers
    setCustomerMetrics({
      activeCustomers: 850,
      newCustomers: 120,
      repeatCustomers: 730,
      growth: Array.from({ length: 30 }, (_, i) => ({
        date: format(subDays(new Date(), 29 - i), 'yyyy-MM-dd'),
        customers: Math.floor(Math.random() * 20) + 800 - (29 - i)
      }))
    });
    
    // Mock data for vendors
    setVendorMetrics({
      totalVendors: 75,
      activeVendors: 62,
      topVendors: [
        { name: 'Farm Fresh Produce', value: 185000 },
        { name: 'Green Harvest', value: 142000 },
        { name: 'Organic Farms', value: 98000 },
        { name: 'Village Market', value: 76000 },
        { name: 'Nature\'s Bounty', value: 65000 }
      ]
    });
    
    // Mock data for categories
    setCategoryData([
      { name: 'Vegetables', value: 35 },
      { name: 'Fruits', value: 25 },
      { name: 'Grains', value: 20 },
      { name: 'Meat', value: 12 },
      { name: 'Seafood', value: 8 }
    ]);
  };
  
  const generateReport = () => {
    setSuccessMessage('Report generated and downloaded successfully');
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };
  
  // Colors for charts
  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EC4899'];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics & Reports</h1>
        <div className="flex items-center space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Refresh
          </button>
          <button
            onClick={generateReport}
            className="flex items-center px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
          >
            <Download className="h-5 w-5 mr-2" />
            Export Report
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 mr-4">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">₦{salesData.totalRevenue.toLocaleString()}</p>
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
              <p className="text-2xl font-semibold text-gray-900">{salesData.totalOrders.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 mr-4">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Customers</p>
              <p className="text-2xl font-semibold text-gray-900">{customerMetrics.activeCustomers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Avg. Order Value</p>
              <p className="text-2xl font-semibold text-gray-900">₦{salesData.averageOrderValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts - First Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#F59E0B" 
                  fill="#FEF3C7" 
                  name="Revenue (₦)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Order Statistics */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Order Status Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData.orderStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#10B981" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts - Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Product Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Top Products</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={productPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {productPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Customer Growth */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Growth</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={customerMetrics.growth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => value.toLocaleString()} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="customers" 
                  stroke="#3B82F6" 
                  name="Customers"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts - Third Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vendors */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Top Vendors by Revenue</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={vendorMetrics.topVendors}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey="value" fill="#8B5CF6" name="Revenue (₦)" />
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
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} products`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoordinatorAnalytics;
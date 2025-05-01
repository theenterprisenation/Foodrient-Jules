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
  Store
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

const ManagerOverview = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('week');
  
  // Dashboard metrics
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    assignedVendors: 0,
    totalCommissions: 0
  });
  
  // Chart data
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);
  
  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      // Fetch assigned vendors
      const { data: assignedVendors, error: vendorsError } = await supabase
        .from('manager_assignments')
        .select('vendor_id')
        .eq('manager_id', user.id);
        
      if (vendorsError) throw vendorsError;
      
      const vendorIds = assignedVendors?.map(v => v.vendor_id) || [];
      
      // Fetch orders for assigned vendors
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          order_items!inner(
            product_id,
            products!inner(
              vendor_id
            )
          )
        `)
        .in('order_items.products.vendor_id', vendorIds.length > 0 ? vendorIds : ['no-vendors'])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
        
      if (ordersError) throw ordersError;
      
      // Fetch manager commissions
      const { data: commissions, error: commissionsError } = await supabase
        .from('manager_commissions')
        .select('amount')
        .eq('manager_id', user.id);
        
      if (commissionsError) throw commissionsError;
      
      // Calculate metrics
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
      const totalOrders = orders?.length || 0;
      const assignedVendorsCount = vendorIds.length;
      const totalCommissions = commissions?.reduce((sum, commission) => sum + Number(commission.amount), 0) || 0;
      
      setMetrics({
        totalRevenue,
        totalOrders,
        assignedVendors: assignedVendorsCount,
        totalCommissions
      });
      
      // Generate revenue data by date
      const revenueByDate = orders?.reduce((acc, order) => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + Number(order.total_amount);
        return acc;
      }, {});
      
      const revenueChartData = Object.entries(revenueByDate || {}).map(([date, revenue]) => ({
        date,
        revenue
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      setRevenueData(revenueChartData);
      
      // Generate order data by date
      const ordersByDate = orders?.reduce((acc, order) => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
      
      const orderChartData = Object.entries(ordersByDate || {}).map(([date, orders]) => ({
        date,
        orders
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      setOrderData(orderChartData);
      
      // Fetch vendor performance
      if (vendorIds.length > 0) {
        const { data: vendors, error: vendorError } = await supabase
          .from('vendors')
          .select('id, business_name')
          .in('id', vendorIds);
          
        if (vendorError) throw vendorError;
        
        // Calculate revenue per vendor
        const vendorRevenue = {};
        orders?.forEach(order => {
          const vendorId = order.order_items[0].products.vendor_id;
          vendorRevenue[vendorId] = (vendorRevenue[vendorId] || 0) + Number(order.total_amount);
        });
        
        const vendorPerformanceData = vendors?.map(vendor => ({
          name: vendor.business_name,
          value: vendorRevenue[vendor.id] || 0
        })).sort((a, b) => b.value - a.value);
        
        setVendorPerformance(vendorPerformanceData || []);
      }
      
      // Fetch product categories
      if (vendorIds.length > 0) {
        const { data: products, error: productsError } = await supabase
          .from('products')
          .select('category')
          .in('vendor_id', vendorIds);
          
        if (productsError) throw productsError;
        
        // Count products by category
        const categoryCounts = products?.reduce((acc, product) => {
          acc[product.category] = (acc[product.category] || 0) + 1;
          return acc;
        }, {});
        
        const categoryChartData = Object.entries(categoryCounts || {}).map(([name, value]) => ({
          name,
          value
        }));
        
        setCategoryData(categoryChartData || []);
      }
      
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
      { date: '2025-04-01', orders: 45 },
      { date: '2025-04-02', orders: 52 },
      { date: '2025-04-03', orders: 49 },
      { date: '2025-04-04', orders: 63 },
      { date: '2025-04-05', orders: 58 },
      { date: '2025-04-06', orders: 64 },
      { date: '2025-04-07', orders: 72 },
    ];
    
    const mockVendorPerformance = [
      { name: 'Farm Fresh Produce', value: 185000 },
      { name: 'Green Harvest', value: 142000 },
      { name: 'Organic Farms', value: 98000 },
      { name: 'Village Market', value: 76000 },
      { name: 'Nature\'s Bounty', value: 65000 },
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
    setVendorPerformance(mockVendorPerformance);
    setCategoryData(mockCategoryData);
    
    setMetrics({
      totalRevenue: 850000,
      totalOrders: 320,
      assignedVendors: 5,
      totalCommissions: 42500
    });
  };
  
  // Colors for pie charts
  const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EC4899'];
  
  // Use mock data if real data is empty
  const displayRevenueData = revenueData.length > 0 ? revenueData : [];
  const displayOrderData = orderData.length > 0 ? orderData : [];
  const displayVendorPerformance = vendorPerformance.length > 0 ? vendorPerformance : [];
  const displayCategoryData = categoryData.length > 0 ? categoryData : [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
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
              <Store className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Assigned Vendors</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.assignedVendors}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 mr-4">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Commissions</p>
              <p className="text-2xl font-semibold text-gray-900">₦{metrics.totalCommissions.toLocaleString()}</p>
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
        {/* Vendor Performance */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Vendor Performance</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayVendorPerformance}
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
    </div>
  );
};

export default ManagerOverview;